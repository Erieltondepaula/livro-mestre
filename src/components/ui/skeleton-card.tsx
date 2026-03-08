import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      {/* Table skeleton */}
      <div className="rounded-xl border border-border bg-card p-3 sm:p-4 space-y-3">
        <Skeleton className="h-5 sm:h-6 w-1/3 mb-3 sm:mb-4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-2 sm:gap-4 items-center">
            <Skeleton className="h-4 w-6 sm:w-8" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 sm:h-6 w-16 sm:w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
