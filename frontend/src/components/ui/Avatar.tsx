import type { FunctionComponent } from '../../common/types';

interface AvatarProps {
  src?: string;
  alt?: string;
  initials?: string;
  avatarId?: string | null; // New: For emoji avatars
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'active' | 'inactive' | 'away';
}

// Avatar emoji mapping
const AVATAR_MAP: Record<string, string> = {
  'avatar-1': '😊',
  'avatar-2': '😎',
  'avatar-3': '🤓',
  'avatar-4': '😺',
  'avatar-5': '🐶',
  'avatar-6': '🦊',
  'avatar-7': '🐼',
  'avatar-8': '🦁',
  'avatar-9': '🐻',
  'avatar-10': '🐨',
  'avatar-11': '🐯',
  'avatar-12': '🦄',
};

const Avatar = ({
  src,
  alt = 'Avatar',
  initials,
  avatarId,
  size = 'md',
  status,
}: AvatarProps): FunctionComponent => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const emojiSizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  };

  const statusClasses = {
    active: 'bg-success',
    inactive: 'bg-muted',
    away: 'bg-warning',
  };

  return (
    <div className="relative inline-flex">
      {/* Emoji Avatar - Priority 1 */}
      {avatarId && AVATAR_MAP[avatarId] ? (
        <div
          className={`${sizeClasses[size]} rounded-full bg-background-tertiary flex items-center justify-center border-2 border-subtle`}
        >
          <span className={emojiSizeClasses[size]}>{AVATAR_MAP[avatarId]}</span>
        </div>
      ) : src ? (
        /* Image Avatar - Priority 2 */
        <img
          src={src}
          alt={alt}
          className={`${sizeClasses[size]} rounded-full object-cover border-2 border-border`}
        />
      ) : (
        /* Initials Avatar - Fallback */
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
export { AVATAR_MAP };
