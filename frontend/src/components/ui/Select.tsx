import React from 'react';
import type { FunctionComponent } from '../../common/types';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, placeholder, error, className = '', ...props }, ref): FunctionComponent => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-primary-950 mb-2 font-mono">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full px-4 py-2 text-primary-text placeholder-muted-text bg-background-secondary border border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 disabled:bg-background-tertiary disabled:cursor-not-allowed font-primary text-base ${
            error ? 'border-red-500 focus:ring-red-500' : ''
          } ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="text-red-500 text-sm mt-1 font-mono">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
