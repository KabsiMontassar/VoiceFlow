import React from 'react';
import type { FunctionComponent } from '../../common/types';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', isLoading = false, className = '', disabled, children, ...props },
    ref
  ): FunctionComponent => {
    const baseClasses =
      'inline-flex items-center justify-center font-primary font-semibold transition-all duration-200 rounded-lg focus-ring disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClasses = {
      primary:
        'bg-primary text-black hover:bg-secondary hover:shadow-[0_6px_16px_rgba(204,255,0,0.3)] hover:-translate-y-0.5 active:translate-y-0 shadow-[0_4px_12px_rgba(204,255,0,0.2)]',
      secondary:
        'bg-background-tertiary text-primary-text border border-default hover:bg-surface hover:border-secondary',
      danger: 'bg-error text-white hover:bg-red-600 shadow-md hover:shadow-lg',
      ghost:
        'bg-transparent text-primary-text border border-default hover:bg-background-tertiary hover:border-secondary',
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm gap-2',
      md: 'px-4 py-2.5 text-sm gap-2.5',
      lg: 'px-6 py-3 text-base gap-3',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
