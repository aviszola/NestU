import TableSkeleton from "@/components/skeletons/TableSkeleton";

export default function AdminRefundsLoading() {
  return (
    <div className="p-4 md:p-8">
      <TableSkeleton rows={5} cols={5} />
    </div>
  );
}
