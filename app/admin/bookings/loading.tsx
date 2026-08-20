import TableSkeleton from "@/components/skeletons/TableSkeleton";

export default function AdminBookingsLoading() {
  return (
    <div className="p-4 md:p-8">
      <TableSkeleton rows={6} cols={5} />
    </div>
  );
}
