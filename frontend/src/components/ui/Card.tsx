import React from 'react';
import type { FunctionComponent } from '../../common/types';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  children: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', className = '', ...props }, ref): FunctionComponent => {
    const variantClasses = {
      default: 'bg-background-tertiary border border-default hover:border-secondary hover:shadow-[0_4px_12px_rgba(201,239,49,0.1)]',
      elevated: 'bg-background-tertiary border border-default shadow-lg hover:shadow-[0_8px_20px_rgba(201,239,49,0.15)]',
      outlined: 'bg-surface border-2 border-default hover:border-secondary',
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
