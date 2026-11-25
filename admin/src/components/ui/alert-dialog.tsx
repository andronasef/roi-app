import * as React from 'react';
import { createPortal } from 'react-dom';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AlertDialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dismissible: boolean;
  titleId: string;
  descriptionId: string;
}

const AlertDialogContext = React.createContext<AlertDialogContextValue | null>(null);

function useAlertDialogContext(): AlertDialogContextValue {
  const ctx = React.useContext(AlertDialogContext);
  if (!ctx) {
    throw new Error('AlertDialog components must be used within <AlertDialog>.');
  }
  return ctx;
}

export interface AlertDialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  dismissible?: boolean;
  children: React.ReactNode;
}

export function AlertDialog({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  dismissible = true,
  children,
}: AlertDialogProps) {
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
    <AlertDialogContext.Provider
      value={{
        open,
        onOpenChange: handleOpenChange,
        dismissible,
        titleId,
        descriptionId,
      }}
    >
      {children}
    </AlertDialogContext.Provider>
  );
}

export interface AlertDialogTriggerProps extends React.ComponentProps<'button'> {
  asChild?: boolean;
}

export function AlertDialogTrigger({
  asChild = false,
  onClick,
  children,
  ...props
}: AlertDialogTriggerProps) {
  const { onOpenChange } = useAlertDialogContext();

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

export function AlertDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  const { open, onOpenChange, dismissible, titleId, descriptionId } = useAlertDialogContext();

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 p-4 backdrop-blur-[1px]">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={cn(
          'relative z-50 w-full max-w-md rounded-xl border border-border bg-background p-6 text-foreground shadow-lg focus:outline-none',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }
  return content;
}

export function AlertDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2 text-start', className)} {...props} />;
}

export function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('mt-6 flex flex-wrap items-center justify-end gap-3', className)} {...props} />
  );
}

export function AlertDialogTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  const { titleId } = useAlertDialogContext();
  return (
    <h2
      id={titleId}
      className={cn('text-xl font-bold leading-snug text-foreground', className)}
      {...props}
    />
  );
}

export function AlertDialogDescription({ className, ...props }: React.ComponentProps<'p'>) {
  const { descriptionId } = useAlertDialogContext();
  return (
    <p
      id={descriptionId}
      className={cn('text-sm font-normal text-muted-foreground', className)}
      {...props}
    />
  );
}

export interface AlertDialogActionProps extends React.ComponentProps<'button'> {
  variant?: 'default' | 'destructive';
}

export function AlertDialogAction({
  className,
  variant = 'destructive',
  type = 'button',
  ...props
}: AlertDialogActionProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size: 'md' }), className)}
      {...props}
    />
  );
}

export function AlertDialogCancel({
  className,
  onClick,
  disabled,
  type = 'button',
  ...props
}: React.ComponentProps<'button'>) {
  const { onOpenChange, dismissible } = useAlertDialogContext();

  return (
    <button
      type={type}
      disabled={disabled || !dismissible}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && dismissible) {
          onOpenChange(false);
        }
      }}
      className={cn(buttonVariants({ variant: 'outline', size: 'md' }), className)}
      {...props}
    />
  );
}
