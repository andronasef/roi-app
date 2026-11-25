import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  disabled: boolean;
  listboxId: string;
  labels: ReadonlyMap<string, React.ReactNode>;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext(): SelectContextValue {
  const ctx = React.useContext(SelectContext);
  if (!ctx) {
    throw new Error('Select components must be used within <Select>.');
  }
  return ctx;
}

function collectSelectLabels(
  nodes: React.ReactNode,
  map: Map<string, React.ReactNode>,
): void {
  React.Children.forEach(nodes, (child) => {
    if (!React.isValidElement<{ value?: unknown; children?: React.ReactNode }>(child)) {
      return;
    }
    if (child.type === SelectItem && typeof child.props.value === 'string') {
      map.set(child.props.value, child.props.children);
    }
    if (child.props.children) {
      collectSelectLabels(child.props.children, map);
    }
  });
}

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export function Select({
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  disabled = false,
  children,
}: SelectProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listboxId = React.useId();

  const isControlled = controlledValue !== undefined;
  const activeValue = isControlled ? controlledValue : uncontrolledValue;

  const labels = React.useMemo(() => {
    const map = new Map<string, React.ReactNode>();
    collectSelectLabels(children, map);
    return map;
  }, [children]);

  const handleValueChange = React.useCallback(
    (next: string) => {
      if (!isControlled) {
        setUncontrolledValue(next);
      }
      onValueChange?.(next);
      setOpen(false);
    },
    [isControlled, onValueChange],
  );

  React.useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <SelectContext.Provider
      value={{
        value: activeValue,
        onValueChange: handleValueChange,
        open,
        setOpen,
        disabled,
        listboxId,
        labels,
      }}
    >
      <div ref={containerRef} className="relative w-full">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({
  className,
  children,
  onClick,
  onKeyDown,
  ...props
}: React.ComponentProps<'button'>) {
  const { open, setOpen, disabled, listboxId } = useSelectContext();

  return (
    <button
      type="button"
      role="combobox"
      aria-expanded={open}
      aria-controls={listboxId}
      aria-haspopup="listbox"
      disabled={disabled || props.disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !disabled) {
          setOpen((prev) => !prev);
        }
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (!event.defaultPrevented && !disabled && event.key === 'ArrowDown') {
          event.preventDefault();
          setOpen(true);
        }
      }}
      className={cn(
        'flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-input bg-background ps-3 pe-3 py-2 text-start text-sm font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      <ChevronDown
        className={cn(
          'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
          open && 'rotate-180',
        )}
        aria-hidden="true"
      />
    </button>
  );
}

export interface SelectValueProps {
  placeholder?: string;
}

export function SelectValue({ placeholder = '' }: SelectValueProps) {
  const { value, labels } = useSelectContext();
  const label = value ? labels.get(value) : undefined;

  if (label !== undefined) {
    return <span>{label}</span>;
  }

  return <span className="text-muted-foreground">{value || placeholder}</span>;
}

export function SelectContent({ className, children, ...props }: React.ComponentProps<'div'>) {
  const { open, listboxId } = useSelectContext();

  if (!open) {
    return null;
  }

  return (
    <div
      id={listboxId}
      role="listbox"
      className={cn(
        'absolute start-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface SelectItemProps extends React.ComponentProps<'button'> {
  value: string;
}

export function SelectItem({
  value,
  className,
  children,
  onClick,
  disabled,
  ...props
}: SelectItemProps) {
  const { value: selectedValue, onValueChange } = useSelectContext();
  const isSelected = selectedValue === value;

  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !disabled) {
          onValueChange(value);
        }
      }}
      className={cn(
        'flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-2 rounded-md ps-3 pe-3 py-2 text-start text-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50',
        isSelected ? 'bg-secondary font-bold text-foreground' : 'font-normal text-foreground',
        className,
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      {isSelected ? <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" /> : null}
    </button>
  );
}
