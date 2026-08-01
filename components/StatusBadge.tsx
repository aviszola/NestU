export default function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  const labels: Record<string, string> = {
    pending: "Menunggu",
    approved: "Disetujui",
    rejected: "Ditolak",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase ${
        styles[status] || "bg-gray-100 text-gray-600"
      }`}
    >
      <span className="material-symbols-outlined text-[16px]">
        {status === "pending"
          ? "hourglass_empty"
          : status === "approved"
            ? "check_circle"
            : "cancel"}
      </span>
      {labels[status] || status}
    </span>
  );
}
