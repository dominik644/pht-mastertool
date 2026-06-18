interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
}

export function LoadingSkeleton({ lines = 3, className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`space-y-2 animate-pulse ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="h-4 rounded bg-dark-600/80"
          style={{ width: `${85 - i * 12}%` }}
        />
      ))}
    </div>
  );
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-dark-500/50 bg-dark-800 p-5 animate-pulse ${className}`}>
      <div className="h-5 w-1/3 rounded bg-dark-600 mb-4" />
      <LoadingSkeleton lines={4} />
    </div>
  );
}
