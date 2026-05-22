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
        <p role="alert" className="text-[11px] text-[#e3a8af]">
          {error}
        </p>
      ) : helper ? (
        <p className="text-[11px] text-ivory/50">{helper}</p>
      ) : null}
    </div>
  );
}
