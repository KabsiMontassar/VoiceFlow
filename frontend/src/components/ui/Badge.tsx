import type { FunctionComponent } from '../../common/types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

const Badge = ({ children, variant = 'primary', size = 'md' }: BadgeProps): FunctionComponent => {
  const variantClasses = {
    primary: 'bg-primary-100 text-primary-900',
    success: 'bg-green-100 text-green-900',
    warning: 'bg-yellow-100 text-yellow-900',
    danger: 'bg-red-100 text-red-900',
    info: 'bg-blue-100 text-blue-900',
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-mono font-bold ${variantClasses[variant]} ${sizeClasses[size]}`}
    >
      {children}
    </span>
  );
};

export default Badge;
