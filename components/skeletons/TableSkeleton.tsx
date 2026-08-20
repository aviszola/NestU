export default function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-outline-variant card-shadow overflow-hidden animate-pulse">
      <div className="p-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
        <div className="h-5 bg-surface-container-high rounded w-48" />
        <div className="h-8 bg-surface-container-high rounded w-28" />
      </div>
      <div className="divide-y divide-outline-variant">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex items-center justify-between gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className={`h-4 bg-surface-container-high rounded ${
                  c === 0 ? "w-1/3" : c === cols - 1 ? "w-16" : "w-1/6"
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
