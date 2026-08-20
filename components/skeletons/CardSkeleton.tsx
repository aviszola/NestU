export function KosCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-outline-variant card-shadow animate-pulse">
      <div className="h-48 bg-surface-container-high w-full" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-surface-container-high rounded w-3/4" />
        <div className="h-3 bg-surface-container-high rounded w-1/2" />
        <div className="flex justify-between items-center pt-2">
          <div className="h-5 bg-surface-container-high rounded w-1/3" />
          <div className="h-4 bg-surface-container-high rounded w-1/4" />
        </div>
      </div>
    </div>
  );
}

export default function KosGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
      {Array.from({ length: count }).map((_, i) => (
        <KosCardSkeleton key={i} />
      ))}
    </div>
  );
}
