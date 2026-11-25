import * as React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'default' | 'success' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

export interface ToastOptions {
  variant?: ToastVariant;
  duration?: number;
}

const DEFAULT_DURATION_MS = 4000;

let toastsState: ToastItem[] = [];
let toastCounter = 0;
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function dismissToast(id?: string): void {
  if (!id) {
    for (const timer of timers.values()) {
      clearTimeout(timer);
    }
    timers.clear();
    toastsState = [];
    emitChange();
    return;
  }

  const timer = timers.get(id);
  if (timer !== undefined) {
    clearTimeout(timer);
    timers.delete(id);
  }
  toastsState = toastsState.filter((item) => item.id !== id);
  emitChange();
}

function addToast(message: string, options: ToastOptions = {}): string {
  const id = `toast-${++toastCounter}`;
  const duration = options.duration ?? DEFAULT_DURATION_MS;
  const variant = options.variant ?? 'default';
  const entry: ToastItem = { id, message, variant, duration };

  toastsState = [...toastsState, entry];
  emitChange();

  if (duration > 0) {
    const timer = setTimeout(() => {
      dismissToast(id);
    }, duration);
    timers.set(id, timer);
  }

  return id;
}

export interface ToastApi {
  (message: string, options?: ToastOptions): string;
  success: (message: string, options?: Omit<ToastOptions, 'variant'>) => string;
  error: (message: string, options?: Omit<ToastOptions, 'variant'>) => string;
  dismiss: (id?: string) => void;
}

export const toast: ToastApi = Object.assign(
  (message: string, options?: ToastOptions) => addToast(message, options),
  {
    success: (message: string, options?: Omit<ToastOptions, 'variant'>) =>
      addToast(message, { ...options, variant: 'success' }),
    error: (message: string, options?: Omit<ToastOptions, 'variant'>) =>
      addToast(message, { ...options, variant: 'error' }),
    dismiss: (id?: string) => dismissToast(id),
  },
);

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ToastItem[] {
  return toastsState;
}

interface ToastContextValue {
  toasts: ToastItem[];
  toast: ToastApi;
  dismiss: (id?: string) => void;
}

const ToastContext = React.createContext<ToastContextValue>({
  toasts: [],
  toast,
  dismiss: dismissToast,
});

export function useToast(): ToastContextValue {
  return React.useContext(ToastContext);
}

export function Toaster() {
  const toasts = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      className={cn(
        'pointer-events-none fixed bottom-4 end-4 z-50 flex w-full max-w-sm flex-col gap-2',
        toasts.length === 0 && 'hidden',
      )}
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          role={item.variant === 'error' ? 'alert' : 'status'}
          className={cn(
            'pointer-events-auto flex items-start justify-between gap-3 rounded-xl border p-4 shadow-md',
            item.variant === 'error'
              ? 'border-destructive bg-destructive text-destructive-foreground'
              : 'border-border bg-card text-card-foreground',
          )}
        >
          <div className="flex items-start gap-2.5 text-start">
            {item.variant === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
            ) : null}
            {item.variant === 'error' ? (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            ) : null}
            <p className="text-sm font-bold leading-5">{item.message}</p>
          </div>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => dismissToast(item.id)}
            className="inline-flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const toasts = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const value = React.useMemo<ToastContextValue>(
    () => ({
      toasts,
      toast,
      dismiss: dismissToast,
    }),
    [toasts],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster />
    </ToastContext.Provider>
  );
}
