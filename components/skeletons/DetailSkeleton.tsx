export default function DetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 animate-pulse">
      <div className="h-6 bg-surface-container-high rounded w-32" />
      <div className="h-80 bg-surface-container-high rounded-2xl w-full" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="h-8 bg-surface-container-high rounded w-3/4" />
          <div className="h-4 bg-surface-container-high rounded w-1/2" />
          <div className="h-32 bg-surface-container-high rounded-xl w-full" />
        </div>
        <div className="space-y-4">
          <div className="h-48 bg-surface-container-high rounded-xl w-full" />
        </div>
      </div>
    </div>
  );
}
