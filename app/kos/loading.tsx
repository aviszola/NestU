import KosGridSkeleton from "@/components/skeletons/CardSkeleton";

export default function KosLoading() {
  return (
    <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-6">
      <div className="h-8 bg-surface-container-high rounded w-48 animate-pulse" />
      <KosGridSkeleton count={6} />
    </main>
  );
}
