import React from 'react';
import type { FunctionComponent } from '../../common/types';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  children: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', className = '', ...props }, ref): FunctionComponent => {
    const variantClasses = {
      default: 'bg-white border border-primary-100 shadow-sm',
      elevated: 'bg-white shadow-lg border border-primary-50',
      outlined: 'bg-primary-50 border-2 border-primary-200',
    };

    return (
      <div
        ref={ref}
        className={`rounded-xl p-6 transition-all duration-200 ${variantClasses[variant]} ${className}`}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

export default Card;
