import TableSkeleton from "@/components/skeletons/TableSkeleton";

export default function AdminOverridesLoading() {
  return (
    <div className="p-4 md:p-8">
      <TableSkeleton rows={4} cols={4} />
    </div>
  );
}
