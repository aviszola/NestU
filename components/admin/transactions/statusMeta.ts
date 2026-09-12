// components/admin/transactions/statusMeta.ts
// Mapping status → label + warna badge (shared across transakci components).

export interface Badge {
  label: string;
  className: string;
  icon: string;
}

const PAYMENT_BADGES: Record<string, Badge> = {
  lunas: { label: "Lunas", className: "bg-secondary/10 text-secondary", icon: "check_circle" },
  menunggu_konfirmasi: {
    label: "Menunggu Konfirmasi",
    className: "bg-tertiary/10 text-tertiary",
    icon: "hourglass_top",
  },
  belum_bayar: { label: "Belum Bayar", className: "bg-error/10 text-error", icon: "schedule" },
  expired: { label: "Kadaluarsa", className: "bg-error/10 text-error", icon: "timer_off" },
};

const BOOKING_BADGES: Record<string, Badge> = {
  pending: { label: "Menunggu", className: "bg-tertiary/10 text-tertiary", icon: "hourglass_top" },
  approved: { label: "Disetujui", className: "bg-tertiary/10 text-tertiary", icon: "task_alt" },
  completed: { label: "Selesai", className: "bg-secondary/10 text-secondary", icon: "task_alt" },
  rejected: { label: "Ditolak", className: "bg-error/10 text-error", icon: "cancel" },
  cancelled: { label: "Dibatalkan", className: "bg-error/10 text-error", icon: "cancel" },
};

const REFUND_BADGES: Record<string, Badge> = {
  none: { label: "Tidak ada", className: "bg-surface-container-high text-outline", icon: "block" },
  pending: { label: "Menunggu", className: "bg-tertiary/10 text-tertiary", icon: "hourglass_top" },
  processed: { label: "Diproses", className: "bg-secondary/10 text-secondary", icon: "check_circle" },
};

const METHOD_BADGES: Record<string, Badge> = {
  midtrans: { label: "Midtrans", className: "bg-primary/10 text-primary", icon: "payments" },
  manual: { label: "Transfer Manual", className: "bg-surface-container-high text-on-surface-variant", icon: "receipt_long" },
};

export function paymentBadge(status?: string | null): Badge {
  const s = status || "belum_bayar";
  return PAYMENT_BADGES[s] ?? PAYMENT_BADGES.belum_bayar;
}

export function bookingBadge(status?: string | null): Badge {
  const s = status || "pending";
  return BOOKING_BADGES[s] ?? BOOKING_BADGES.pending;
}

export function refundBadge(status?: string | null): Badge {
  const s = status || "none";
  return REFUND_BADGES[s] ?? REFUND_BADGES.none;
}

export function methodBadge(method: "midtrans" | "manual"): Badge {
  return METHOD_BADGES[method];
}