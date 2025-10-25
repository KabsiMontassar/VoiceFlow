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
          <label className="block text-sm font-medium text-neutral-950 mb-2 font-mono">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-800">{icon}</div>}
          <input
            ref={ref}
            disabled={disabled}
            className={`w-full px-4 py-2 ${icon ? 'pl-10' : ''} text-neutral-950 placeholder-neutral-500 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-transparent transition-all duration-200 disabled:bg-neutral-50 disabled:cursor-not-allowed font-mono text-base ${
              error ? 'border-red-500 focus:ring-red-500' : ''
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-red-500 text-sm mt-1 font-mono">{error}</p>}
        {helperText && !error && <p className="text-neutral-600 text-sm mt-1 font-mono">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
