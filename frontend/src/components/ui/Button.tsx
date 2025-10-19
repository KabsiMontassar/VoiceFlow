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
      'inline-flex items-center justify-center font-medium font-mono transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-900 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClasses = {
      primary:
        'bg-primary-900 text-white hover:bg-primary-800 active:bg-primary-950 shadow-md hover:shadow-lg',
      secondary:
        'bg-primary-100 text-primary-950 hover:bg-primary-200 active:bg-primary-300 shadow-sm',
      danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-md hover:shadow-lg',
      ghost:
        'bg-transparent text-primary-900 hover:bg-primary-50 active:bg-primary-100 border border-primary-200',
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm gap-2',
      md: 'px-4 py-2 text-base gap-2.5',
      lg: 'px-6 py-3 text-lg gap-3',
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
            className="animate-spin -ml-1 mr-2 h-4 w-4"
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
