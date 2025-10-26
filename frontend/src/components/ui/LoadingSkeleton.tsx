interface LoadingSkeletonProps {
  variant?: 'text' | 'circle' | 'rectangle' | 'card';
  width?: string;
  height?: string;
  count?: number;
  className?: string;
}

export default function LoadingSkeleton({
  variant = 'rectangle',
  width = 'w-full',
  height = 'h-4',
  count = 1,
  className = '',
}: LoadingSkeletonProps) {
  const baseClasses = 'bg-background-tertiary animate-pulse rounded';

  const variantClasses = {
    text: `${height} ${width}`,
    circle: 'rounded-full',
    rectangle: `${height} ${width}`,
    card: 'h-32 w-full rounded-lg',
  };

  const skeletonClass = `${baseClasses} ${variantClasses[variant]} ${className}`;

  if (count === 1) {
    return <div className={skeletonClass} />;
  }

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={skeletonClass} />
      ))}
    </>
  );
}

// Pre-configured skeleton components
export function FriendCardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <LoadingSkeleton variant="circle" className="w-12 h-12" />
        <div className="flex-1 space-y-2">
          <LoadingSkeleton height="h-4" width="w-32" />
          <LoadingSkeleton height="h-3" width="w-24" />
        </div>
      </div>
      <LoadingSkeleton height="h-3" width="w-full" />
      <LoadingSkeleton height="h-9" width="w-full" />
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <LoadingSkeleton variant="circle" className="w-8 h-8" />
        <div className="flex-1 space-y-2">
          <LoadingSkeleton height="h-3" width="w-24" />
          <LoadingSkeleton height="h-12" width="w-3/4" />
        </div>
      </div>
    </div>
  );
}

export function RoomListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="card p-3 flex items-center gap-3">
          <LoadingSkeleton variant="circle" className="w-10 h-10" />
          <div className="flex-1 space-y-2">
            <LoadingSkeleton height="h-4" width="w-40" />
            <LoadingSkeleton height="h-3" width="w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
