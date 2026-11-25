import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps extends Omit<React.ComponentProps<'button'>, 'onChange'> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  onClick,
  onKeyDown,
  ...props
}: SwitchProps) {
  const state = checked ? 'checked' : 'unchecked';

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented && !disabled) {
      onCheckedChange?.(!checked);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled) {
      return;
    }
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      onCheckedChange?.(!checked);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-state={state}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'inline-flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <span
        data-state={state}
        aria-hidden="true"
        className={cn(
          'inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors',
          checked ? 'bg-primary' : 'bg-border',
        )}
      >
        <span
          data-state={state}
          className="pointer-events-none block h-5 w-5 rounded-full bg-background shadow-sm transition-transform duration-150 translate-x-0 ltr:data-[state=checked]:translate-x-5 rtl:data-[state=checked]:-translate-x-5"
        />
      </span>
    </button>
  );
}
