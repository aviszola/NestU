import Link from "next/link";

function getStatus(booking: any): { label: string; className: string } {
  if (booking.status === "pending")
    return { label: "Menunggu Persetujuan", className: "bg-tertiary/10 text-tertiary" };
  if (booking.status === "approved") {
    if (booking.payment_status === "lunas")
      return { label: "Lunas", className: "bg-secondary/10 text-secondary" };
    if (booking.payment_status === "menunggu_konfirmasi")
      return { label: "Menunggu Konfirmasi", className: "bg-tertiary-container/20 text-on-tertiary-container" };
    return { label: "Menunggu Pembayaran", className: "bg-tertiary/10 text-tertiary" };
  }
  if (booking.status === "cancelled")
    return { label: "Dibatalkan", className: "bg-error-container text-on-error-container" };
  if (booking.status === "completed")
    return { label: "Selesai", className: "bg-primary/10 text-primary" };
  return { label: "Ditolak", className: "bg-error-container text-on-error-container" };
}

export default function BookingCard({
  booking,
  ownerName,
}: {
  booking: any;
  ownerName?: string | null;
}) {
  const status = getStatus(booking);
  const room = booking.rooms;
  const kos = room?.kos;
  const needsPayment =
    booking.status === "approved" && booking.payment_status !== "lunas";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-outline-variant/40 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <span
          className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${status.className}`}
        >
          {status.label}
        </span>
        <span className="text-[11px] text-outline font-mono">
          #{booking.id.slice(0, 8)}
        </span>
      </div>

      <h3 className="font-bold text-on-surface">{kos?.name ?? "Kos"}</h3>

      <div className="mt-2 space-y-1 text-sm text-on-surface-variant">
        {room && (
          <p className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">
              meeting_room
            </span>
            Kamar {room.room_number}
          </p>
        )}
        {booking.move_in_date && (
          <p className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">
              calendar_today
            </span>
            Check-in:{" "}
            {new Date(booking.move_in_date).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
        <p className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base">person</span>
          Pemilik: {ownerName ?? "—"}
        </p>
      </div>

      {needsPayment && (
        <Link
          href={`/bookings/${booking.id}`}
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          Selesaikan Pembayaran
          <span className="material-symbols-outlined text-base">
            arrow_forward
          </span>
        </Link>
      )}
    </div>
  );
}
