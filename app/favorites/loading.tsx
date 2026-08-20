import KosGridSkeleton from "@/components/skeletons/CardSkeleton";

export default function FavoritesLoading() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <div className="h-8 bg-surface-container-high rounded w-40 animate-pulse" />
      <KosGridSkeleton count={4} />
    </div>
  );
}
