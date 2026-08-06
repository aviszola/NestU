/**
 * Status booking — mapping terpusat (label, warna badge, icon per status).
 * Satu-satunya sumber kebenaran untuk status display booking.
 * Digunakan oleh: BookingsContent.tsx, app/bookings/[id]/page.tsx, app/owner/bookings/page.tsx
 */

export type BookingStatusKey =
  | "pending"
  | "approved"
  | "menunggu_konfirmasi"
  | "lunas"
  | "cancelled"
  | "rejected"
  | "completed";

export interface BookingStatusCfg {
  label: string;
  className: string;
  icon: string;
}

export const BOOKING_STATUS: Record<BookingStatusKey, BookingStatusCfg> = {
  pending: {
    label: "Menunggu Persetujuan Pemilik",
    className: "bg-tertiary/10 text-tertiary",
    icon: "hourglass_top",
  },
  approved: {
    label: "Menunggu Pembayaran",
    className: "bg-tertiary/10 text-tertiary",
    icon: "payment",
  },
  menunggu_konfirmasi: {
    label: "Menunggu Konfirmasi Pembayaran",
    className: "bg-tertiary-container/20 text-on-tertiary-container",
    icon: "hourglass_top",
  },
  lunas: {
    label: "Lunas",
    className: "bg-secondary/10 text-secondary",
    icon: "check_circle",
  },
  cancelled: {
    label: "Dibatalkan",
    className: "bg-error/10 text-error",
    icon: "cancel",
  },
  rejected: {
    label: "Ditolak",
    className: "bg-error/10 text-error",
    icon: "cancel",
  },
  completed: {
    label: "Selesai",
    className: "bg-primary/10 text-primary",
    icon: "task_alt",
  },
};

/** Derivasi key status gabungan: booking.status + payment_status. */
export function getStatusKey(booking: {
  status: string;
  payment_status?: string | null;
}): BookingStatusKey {
  if (booking.status === "approved") {
    if (booking.payment_status === "lunas") return "lunas";
    if (booking.payment_status === "menunggu_konfirmasi") return "menunggu_konfirmasi";
    return "approved";
  }
  return (booking.status as BookingStatusKey) || "pending";
}

export function getBookingStatus(booking: {
  status: string;
  payment_status?: string | null;
}): BookingStatusCfg {
  return BOOKING_STATUS[getStatusKey(booking)];
}
