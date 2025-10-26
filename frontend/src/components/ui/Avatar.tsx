import type { FunctionComponent } from '../../common/types';

interface AvatarProps {
  src?: string;
  alt?: string;
  initials?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'active' | 'inactive' | 'away';
}

const Avatar = ({
  src,
  alt = 'Avatar',
  initials,
  size = 'md',
  status,
}: AvatarProps): FunctionComponent => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const statusClasses = {
    active: 'bg-success',
    inactive: 'bg-muted',
    away: 'bg-warning',
  };

  return (
    <div className="relative inline-flex">
      {src ? (
        <img
          src={src}
          alt={alt}
          className={`${sizeClasses[size]} rounded-full object-cover border-2 border-border`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-primary/80 to-secondary font-primary font-bold flex items-center justify-center border-2 border-primary text-black`}
        >
          {initials}
        </div>
      )}
      {status && (
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background-primary ${statusClasses[status]}`}
        />
      )}
    </div>
  );
};

export default Avatar;
