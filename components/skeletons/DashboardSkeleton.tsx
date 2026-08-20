export default function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 bg-surface-container-high rounded w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 bg-surface-container-high rounded-xl" />
        ))}
      </div>
      <div className="h-64 bg-surface-container-high rounded-2xl w-full" />
    </div>
  );
}
