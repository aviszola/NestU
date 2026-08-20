import TableSkeleton from "@/components/skeletons/TableSkeleton";

export default function BookingsLoading() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <TableSkeleton rows={4} cols={4} />
    </div>
  );
}
