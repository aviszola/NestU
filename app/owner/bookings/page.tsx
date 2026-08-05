"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { updateBookingStatus } from "@/lib/supabase/queries";
import { confirmPayment } from "@/lib/supabase/queries";
import { useEffect, useState } from "react";
import OwnerShell from "@/components/layout/OwnerShell";
import { toastSuccess, toastError } from "@/lib/toast";
import { toReadableError } from "@/lib/utils";

type PaymentKey =
  | "pending"
  | "approved"
  | "menunggu_konfirmasi"
  | "lunas"
  | "cancelled"
  | "rejected"
  | "completed";

const statusCfg: Record<PaymentKey, { label: string; icon: string; className: string }> = {
  pending: {
    label: "Menunggu Persetujuan",
    icon: "hourglass_top",
    className: "bg-tertiary/10 text-tertiary",
  },
  approved: {
    label: "Disetujui — Belum Bayar",
    icon: "schedule_send",
    className: "bg-tertiary/10 text-tertiary",
  },
  menunggu_konfirmasi: {
    label: "Menunggu Konfirmasi Pembayaran",
    icon: "hourglass_top",
    className: "bg-tertiary/10 text-tertiary",
  },
  lunas: {
    label: "Lunas",
    icon: "check_circle",
    className: "bg-secondary/10 text-secondary",
  },
  cancelled: {
    label: "Dibatalkan",
    icon: "cancel",
    className: "bg-error/10 text-error",
  },
  rejected: {
    label: "Ditolak",
    icon: "cancel",
    className: "bg-error/10 text-error",
  },
  completed: {
    label: "Selesai",
    icon: "task_alt",
    className: "bg-primary/10 text-primary",
  },
};

function getStatusKey(b: any): PaymentKey {
  if (b.status === "approved") {
    if (b.payment_status === "lunas") return "lunas";
    if (b.payment_status === "menunggu_konfirmasi") return "menunggu_konfirmasi";
    return "approved";
  }
  return b.status as PaymentKey;
}

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "pending", label: "Menunggu Persetujuan" },
  { key: "approved", label: "Belum Bayar" },
  { key: "menunggu_konfirmasi", label: "Menunggu Konfirmasi" },
  { key: "lunas", label: "Lunas" },
  { key: "cancelled", label: "Ditolak/Dibatalkan" },
  { key: "rejected", label: "Ditolak" },
  { key: "completed", label: "Selesai" },
];

export default function OwnerBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function loadAllBookings() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: kosList } = await supabase
        .from("kos")
        .select("id, name")
        .eq("owner_id", user.id);

      if (!kosList || kosList.length === 0) {
        setBookings([]);
        return;
      }

      const kosIds = kosList.map((k) => k.id);

      const { data: rooms } = await supabase
        .from("rooms")
        .select("id")
        .in("kos_id", kosIds);

      if (!rooms || rooms.length === 0) {
        setBookings([]);
        return;
      }

      const roomIds = rooms.map((r) => r.id);

      const { data: bookings } = await supabase
        .from("bookings")
        .select("*, rooms:room_id(id, room_number, price_per_month, kos:kos_id(id, name))")
        .in("room_id", roomIds)
        .order("created_at", { ascending: false });

      if (bookings && bookings.length > 0) {
        const studentIds = [...new Set(bookings.map((b: any) => b.student_id))];
        const { data: profiles } = await supabase
          .from("profiles_public")
          .select("id, full_name")
          .in("id", studentIds);
        const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));
        const enriched = (bookings as any[]).map((b: any) => ({
          ...b,
          student: profileMap[b.student_id] ?? null,
        }));
        setBookings(enriched);
      } else {
        setBookings([]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllBookings();
  }, []);

  async function handleStatus(id: string, status: "approved" | "cancelled" | "completed") {
    setActionLoading(id);
    setError(null);
    try {
      const supabase = createClient();
      await updateBookingStatus(supabase, id, status);
      toastSuccess("Status booking diperbarui.");
      loadAllBookings();
    } catch (err: any) {
      setError(toReadableError(err));
      toastError("Gagal memperbarui booking: " + toReadableError(err));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleConfirmPayment(id: string) {
    setActionLoading(id);
    setError(null);
    try {
      const supabase = createClient();
      await confirmPayment(supabase, id);
      toastSuccess("Pembayaran dikonfirmasi. Status booking: Lunas.");
      loadAllBookings();
    } catch (err: any) {
      setError(toReadableError(err));
      toastError("Gagal konfirmasi pembayaran: " + toReadableError(err));
    } finally {
      setActionLoading(null);
    }
  }

  const filteredBookings =
    filter === "all"
      ? bookings
      : bookings.filter((b) => getStatusKey(b) === filter);

  if (loading) return <p className="text-outline">Memuat...</p>;

  return (
    <OwnerShell activePage="bookings">
      <div className="px-margin-mobile md:px-margin-desktop py-stack-lg">
        <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold mb-stack-lg">
          Permintaan Booking
        </h1>

        {/* Filter status pembayaran */}
        <div className="flex flex-wrap gap-2 mb-stack-lg">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-label-md font-bold transition-colors ${
                filter === f.key
                  ? "bg-primary-container text-on-primary-container"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant font-body-md">
            <span className="material-symbols-outlined text-4xl text-outline block mb-2">calendar_month</span>
            Belum ada permintaan booking untuk properti Anda.
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant font-body-md">
            <span className="material-symbols-outlined text-4xl text-outline block mb-2">inbox</span>
            Tidak ada booking yang sesuai filter.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((b: any) => {
              const cfg = statusCfg[getStatusKey(b)] ?? statusCfg.pending;
              const isPending = b.status === "pending";
              const isApproved = b.status === "approved";
              const isWaitingConfirm =
                b.payment_status === "menunggu_konfirmasi";
              const isManual =
                b.payment_method !== "midtrans" &&
                b.payment_method !== "snap" &&
                !!b.payment_method;

              return (
                <Card key={b.id}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-on-surface">
                        {b.student?.full_name ?? "User"} — {b.rooms?.kos?.name}
                      </p>
                      <p className="text-sm text-on-surface-variant">
                        {b.rooms?.room_number} ·{" "}
                        {new Date(b.created_at).toLocaleDateString("id-ID")}
                      </p>
                      {b.notes && (
                        <p className="text-xs text-outline">
                          Catatan: {b.notes}
                        </p>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 shrink-0 rounded-full px-3 py-1 text-xs font-bold ${cfg.className}`}
                    >
                      <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {cfg.icon}
                      </span>
                      {cfg.label}
                    </span>
                  </div>

                  {isPending && (
                    <div className="mt-4 flex gap-2 border-t border-outline-variant pt-4">
                      <Button
                        onClick={() => handleStatus(b.id, "approved")}
                        disabled={actionLoading === b.id}
                      >
                        {actionLoading === b.id ? "..." : "Konfirmasi"}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleStatus(b.id, "cancelled")}
                        disabled={actionLoading === b.id}
                      >
                        {actionLoading === b.id ? "..." : "Tolak"}
                      </Button>
                    </div>
                  )}

                  {isApproved && !isWaitingConfirm && (
                    <div className="mt-4 flex gap-2 border-t border-outline-variant pt-4">
                      <Button
                        variant="secondary"
                        onClick={() => handleStatus(b.id, "completed")}
                        disabled={actionLoading === b.id}
                      >
                        {actionLoading === b.id ? "..." : "Tandai Selesai"}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleStatus(b.id, "cancelled")}
                        disabled={actionLoading === b.id}
                      >
                        {actionLoading === b.id ? "..." : "Batalkan"}
                      </Button>
                    </div>
                  )}

                  {isApproved && isWaitingConfirm && (
                    <div className="mt-4 flex gap-2 border-t border-outline-variant pt-4">
                      {isManual && (
                        <Button
                          variant="secondary"
                          onClick={() => handleConfirmPayment(b.id)}
                          disabled={actionLoading === b.id}
                        >
                          {actionLoading === b.id ? "..." : "Konfirmasi Pembayaran"}
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        onClick={() => handleStatus(b.id, "cancelled")}
                        disabled={actionLoading === b.id}
                      >
                        {actionLoading === b.id ? "..." : "Batalkan"}
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg bg-error/10 text-error p-3 text-sm font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {error}
          </div>
        )}
      </div>
    </OwnerShell>
  );
}
