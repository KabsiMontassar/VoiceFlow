import React from 'react';
import type { FunctionComponent } from '../../common/types';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, helperText, icon, className = '', disabled, ...props },
    ref
  ): FunctionComponent => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-semibold text-primary-text mb-2 font-primary">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">{icon}</div>}
          <input
            ref={ref}
            disabled={disabled}
            className={`w-full px-4 py-2.5 ${icon ? 'pl-10' : ''} text-primary-text placeholder:text-muted bg-background-secondary border border-default rounded-lg focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(204,255,0,0.1)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-primary text-sm ${
              error ? 'border-error focus:border-error focus:shadow-[0_0_0_3px_rgba(248,113,113,0.1)]' : ''
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-error text-sm mt-1.5 font-primary">{error}</p>}
        {helperText && !error && <p className="text-muted text-sm mt-1.5 font-primary">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
