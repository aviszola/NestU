import AdminShell from "@/components/layout/AdminShell";
import TableSkeleton from "@/components/skeletons/TableSkeleton";

export default function TransactionsLoading() {
  return (
    <AdminShell activePage="transactions">
      <div className="p-margin-mobile md:p-margin-desktop animate-pulse">
        <div className="h-8 w-1/3 rounded bg-surface-container-high mb-2" />
        <div className="h-4 w-1/2 rounded bg-surface-container-high mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mt-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-surface-container-high" />
          ))}
        </div>
        <div className="rounded-xl bg-surface-container-high mt-4">
          <TableSkeleton rows={8} cols={5} />
        </div>
      </div>
    </AdminShell>
  );
}