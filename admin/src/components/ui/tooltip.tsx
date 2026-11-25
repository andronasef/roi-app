import * as React from 'react';
import { cn } from '@/lib/utils';

interface TooltipContextValue {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  tooltipId: string;
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

function useTooltipContext(): TooltipContextValue {
  const ctx = React.useContext(TooltipContext);
  if (!ctx) {
    throw new Error('Tooltip components must be used within <Tooltip>.');
  }
  return ctx;
}

export interface TooltipProviderProps {
  children: React.ReactNode;
  delayDuration?: number;
}

export function TooltipProvider({ children }: TooltipProviderProps) {
  return <>{children}</>;
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const tooltipId = React.useId();

  React.useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <TooltipContext.Provider value={{ open, setOpen, tooltipId }}>
      <span className="relative inline-flex">{children}</span>
    </TooltipContext.Provider>
  );
}

export interface TooltipTriggerProps extends React.ComponentProps<'span'> {
  asChild?: boolean;
}

export function TooltipTrigger({
  asChild = false,
  children,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...props
}: TooltipTriggerProps) {
  const { open, setOpen, tooltipId } = useTooltipContext();

  if (asChild && React.isValidElement<Record<string, unknown>>(children)) {
    const childMouseEnter = children.props.onMouseEnter as
      | ((event: React.MouseEvent<HTMLElement>) => void)
      | undefined;
    const childMouseLeave = children.props.onMouseLeave as
      | ((event: React.MouseEvent<HTMLElement>) => void)
      | undefined;
    const childFocus = children.props.onFocus as
      | ((event: React.FocusEvent<HTMLElement>) => void)
      | undefined;
    const childBlur = children.props.onBlur as
      | ((event: React.FocusEvent<HTMLElement>) => void)
      | undefined;

    return React.cloneElement(children, {
      'aria-describedby': open ? tooltipId : undefined,
      onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
        childMouseEnter?.(event);
        setOpen(true);
      },
      onMouseLeave: (event: React.MouseEvent<HTMLElement>) => {
        childMouseLeave?.(event);
        setOpen(false);
      },
      onFocus: (event: React.FocusEvent<HTMLElement>) => {
        childFocus?.(event);
        setOpen(true);
      },
      onBlur: (event: React.FocusEvent<HTMLElement>) => {
        childBlur?.(event);
        setOpen(false);
      },
    });
  }

  return (
    <span
      tabIndex={0}
      aria-describedby={open ? tooltipId : undefined}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        setOpen(true);
      }}
      onMouseLeave={(event) => {
        onMouseLeave?.(event);
        setOpen(false);
      }}
      onFocus={(event) => {
        onFocus?.(event);
        setOpen(true);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        setOpen(false);
      }}
      {...props}
    >
      {children}
    </span>
  );
}

export function TooltipContent({ className, children, ...props }: React.ComponentProps<'span'>) {
  const { open, tooltipId } = useTooltipContext();

  if (!open) {
    return null;
  }

  return (
    <span
      id={tooltipId}
      role="tooltip"
      className={cn(
        'pointer-events-none absolute bottom-full start-1/2 z-50 mb-2 whitespace-nowrap rounded-md border border-border bg-primary px-2.5 py-1 text-sm font-normal text-primary-foreground shadow-sm ltr:-translate-x-1/2 rtl:translate-x-1/2',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
