import { createContext, useContext } from 'react';

/**
 * Toast queue context + `useToast()` hook, kept in a non-component module so
 * `Toast.tsx` can stay component-only (Fast Refresh hygiene). `ToastProvider`
 * (in `Toast.tsx`) supplies the value; `useToast()` is the public consumer API.
 */

export type ToastTone = 'info' | 'win' | 'loss';

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Auto-dismiss after this many ms (Radix default 4000). */
  duration?: number;
}

export interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a <ToastProvider>.');
  }
  return ctx;
}
