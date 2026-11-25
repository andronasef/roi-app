import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dismissible: boolean;
  titleId: string;
  descriptionId: string;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext(): DialogContextValue {
  const ctx = React.useContext(DialogContext);
  if (!ctx) {
    throw new Error('Dialog components must be used within <Dialog>.');
  }
  return ctx;
}

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  dismissible?: boolean;
  children: React.ReactNode;
}

export function Dialog({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  dismissible = true,
  children,
}: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const titleId = React.useId();
  const descriptionId = React.useId();
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next && !dismissible) {
        return;
      }
      if (!isControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [dismissible, isControlled, onOpenChange],
  );

  return (
    <DialogContext.Provider
      value={{
        open,
        onOpenChange: handleOpenChange,
        dismissible,
        titleId,
        descriptionId,
      }}
    >
      {children}
    </DialogContext.Provider>
  );
}

export interface DialogTriggerProps extends React.ComponentProps<'button'> {
  asChild?: boolean;
}

export function DialogTrigger({
  asChild = false,
  onClick,
  children,
  ...props
}: DialogTriggerProps) {
  const { onOpenChange } = useDialogContext();

  if (asChild && React.isValidElement<Record<string, unknown>>(children)) {
    const childOnClick = children.props.onClick as
      | ((event: React.MouseEvent<HTMLElement>) => void)
      | undefined;
    return React.cloneElement(children, {
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        childOnClick?.(event);
        if (!event.defaultPrevented) {
          onOpenChange(true);
        }
      },
    });
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          onOpenChange(true);
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export interface DialogContentProps extends React.ComponentProps<'div'> {
  closeLabel?: string;
}

export function DialogContent({
  className,
  children,
  closeLabel = 'Close',
  ...props
}: DialogContentProps) {
  const { open, onOpenChange, dismissible, titleId, descriptionId } = useDialogContext();

  React.useEffect(() => {
    if (!open || !dismissible) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, dismissible, onOpenChange]);

  if (!open) {
    return null;
  }

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 p-4 backdrop-blur-[1px]"
      onClick={(event) => {
        if (event.target === event.currentTarget && dismissible) {
          onOpenChange(false);
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={cn(
          'relative z-50 w-full max-w-lg rounded-xl border border-border bg-background p-6 text-foreground shadow-lg focus:outline-none',
          className,
        )}
        {...props}
      >
        {dismissible ? (
          <button
            type="button"
            aria-label={closeLabel}
            onClick={() => onOpenChange(false)}
            className="absolute top-3 end-3 inline-flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
        {children}
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }
  return content;
}

export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1.5 text-start', className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('mt-6 flex flex-wrap items-center justify-end gap-3', className)} {...props} />
  );
}

export function DialogTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  const { titleId } = useDialogContext();
  return (
    <h2
      id={titleId}
      className={cn('text-xl font-bold leading-snug text-foreground', className)}
      {...props}
    />
  );
}

export function DialogDescription({ className, ...props }: React.ComponentProps<'p'>) {
  const { descriptionId } = useDialogContext();
  return (
    <p
      id={descriptionId}
      className={cn('text-sm font-normal text-muted-foreground', className)}
      {...props}
    />
  );
}

export interface DialogCloseProps extends React.ComponentProps<'button'> {
  asChild?: boolean;
}

export function DialogClose({ asChild = false, onClick, children, ...props }: DialogCloseProps) {
  const { onOpenChange, dismissible } = useDialogContext();

  if (asChild && React.isValidElement<Record<string, unknown>>(children)) {
    const childOnClick = children.props.onClick as
      | ((event: React.MouseEvent<HTMLElement>) => void)
      | undefined;
    return React.cloneElement(children, {
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        childOnClick?.(event);
        if (!event.defaultPrevented && dismissible) {
          onOpenChange(false);
        }
      },
    });
  }

  return (
    <button
      type="button"
      disabled={!dismissible || props.disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && dismissible) {
          onOpenChange(false);
        }
      }}
      {...props}
    >
      {children}
    </button>
  );
}
