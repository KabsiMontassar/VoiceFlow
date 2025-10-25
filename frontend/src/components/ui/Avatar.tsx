import type { FunctionComponent } from '../../common/types';

interface AvatarProps {
  src?: string;
  alt?: string;
  initials?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away';
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
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
  };

  return (
    <div className="relative inline-flex">
      {src ? (
        <img
          src={src}
          alt={alt}
          className={`${sizeClasses[size]} rounded-full object-cover border-2 border-neutral-100`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-neutral-900 text-white font-mono font-bold flex items-center justify-center border-2 border-neutral-100`}
        >
          {initials}
        </div>
      )}
      {status && (
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${statusClasses[status]}`}
        />
      )}
    </div>
  );
};

export default Avatar;
