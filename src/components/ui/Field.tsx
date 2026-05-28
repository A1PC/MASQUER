import type { JSX, ReactNode } from 'react';
import { cn } from './cn';

interface FieldProps {
  id: string;
  label: string;
  helper?: string;
  error?: string;
  className?: string;
  children: ReactNode; // the control, with matching id
}

/**
 * Form-field wrapper: an uppercase tracked label associated with its control
 * via `htmlFor`/`id`, plus helper text that becomes an oxblood `role="alert"`
 * error message when `error` is set.
 */
export function Field({ id, label, helper, error, className, children }: FieldProps): JSX.Element {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={id}
        className="font-body text-[10px] uppercase tracking-[0.15em] text-ivory/70"
      >
        {label}
      </label>
      {children}
      {error ? (
        // Pick: reuse the existing `casino-red` token (already in tailwind config)
        // rather than adding a new `state-loss-soft` alias — one-line cheapest fix
        // and unifies Field/Input/Toast/LoginPage/RegisterPage on one token.
        <p role="alert" className="text-[11px] text-casino-red">
          {error}
        </p>
      ) : helper ? (
        <p className="text-[11px] text-ivory/50">{helper}</p>
      ) : null}
    </div>
  );
}
