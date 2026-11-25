import * as React from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
  baseId: string;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = React.useContext(TabsContext);
  if (!ctx) {
    throw new Error('Tabs components must be used within <Tabs>.');
  }
  return ctx;
}

export interface TabsProps extends Omit<React.ComponentProps<'div'>, 'defaultValue'> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export function Tabs({
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  className,
  children,
  ...props
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const baseId = React.useId();
  const isControlled = controlledValue !== undefined;
  const activeValue = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = React.useCallback(
    (next: string) => {
      if (!isControlled) {
        setUncontrolledValue(next);
      }
      onValueChange?.(next);
    },
    [isControlled, onValueChange],
  );

  return (
    <TabsContext.Provider value={{ value: activeValue, onValueChange: handleValueChange, baseId }}>
      <div className={cn('flex flex-col gap-4', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex flex-wrap items-center gap-1 rounded-lg border border-border bg-secondary p-1 text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export interface TabsTriggerProps extends React.ComponentProps<'button'> {
  value: string;
}

export function TabsTrigger({
  value,
  className,
  onClick,
  disabled,
  children,
  ...props
}: TabsTriggerProps) {
  const { value: activeValue, onValueChange, baseId } = useTabsContext();
  const isSelected = activeValue === value;

  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={isSelected}
      aria-controls={`${baseId}-panel-${value}`}
      data-state={isSelected ? 'active' : 'inactive'}
      disabled={disabled}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented && !disabled) {
          onValueChange(value);
        }
      }}
      className={cn(
        'inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
        isSelected
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps extends React.ComponentProps<'div'> {
  value: string;
}

export function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const { value: activeValue, baseId } = useTabsContext();
  const isSelected = activeValue === value;

  if (!isSelected) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      tabIndex={0}
      className={cn(
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
