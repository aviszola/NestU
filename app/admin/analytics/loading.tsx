import AdminShell from "@/components/layout/AdminShell";

export default function AnalyticsLoading() {
  return (
    <AdminShell activePage="analytics">
      <div className="p-margin-mobile md:p-margin-desktop animate-pulse">
        <div className="h-8 w-1/3 rounded bg-surface-container-high mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mt-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-surface-container-high" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-surface-container-high mt-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-52 rounded-xl bg-surface-container-high" />
          ))}
        </div>
      </div>
    </AdminShell>
  );
}