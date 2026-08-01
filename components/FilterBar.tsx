import Link from "next/link";

export default function FilterBar({
  statusFilter,
  searchQuery,
  totalCount,
  basePath,
}: {
  statusFilter: string;
  searchQuery: string;
  totalCount: number;
  basePath: string;
}) {
  const statuses = [
    { value: "all", label: "Semua" },
    { value: "pending", label: "Menunggu" },
    { value: "approved", label: "Disetujui" },
    { value: "rejected", label: "Ditolak" },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 mb-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {statuses.map((s) => (
            <Link
              key={s.value}
              href={
                s.value === "all"
                  ? basePath
                  : `${basePath}?status=${s.value}${searchQuery ? `&search=${searchQuery}` : ""}`
              }
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                statusFilter === s.value
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
        <p className="text-sm text-gray-500 whitespace-nowrap">
          <span className="font-medium">{totalCount}</span> total booking
        </p>
      </div>
    </div>
  );
}
