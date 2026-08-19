"use client";

import { createClient } from "@/lib/supabase/client";
import { updateBookingStatus, confirmPayment } from "@/lib/supabase/queries";
import { useEffect, useState } from "react";
import OwnerShell from "@/components/layout/OwnerShell";
import { toastSuccess, toastError } from "@/lib/toast";
import { toReadableError } from "@/lib/utils";
import { BOOKING_STATUS, getStatusKey as sharedGetStatusKey } from "@/lib/bookingStatus";

type PaymentKey =
  | "pending"
  | "approved"
  | "menunggu_konfirmasi"
  | "lunas"
  | "cancelled"
  | "rejected"
  | "completed";

// Label OK yang spesifik konteks owner, sisanya pakai shared map.
const statusCfg: Record<PaymentKey, { label: string; icon: string; className: string }> = {
  ...BOOKING_STATUS,
  approved: { label: "Disetujui — Belum Bayar", icon: "schedule_send", className: "bg-tertiary/10 text-tertiary" },
  pending: { label: "Menunggu Persetujuan", icon: "hourglass_top", className: "bg-tertiary/10 text-tertiary" },
  menunggu_konfirmasi: { label: "Menunggu Konfirmasi Pembayaran", icon: "hourglass_top", className: "bg-tertiary/10 text-tertiary" },
};

function getStatusKey(b: any): PaymentKey {
  return sharedGetStatusKey(b);
}

// ── Filter tabs — key "rejected" dihapus (getStatusKey tak pernah return "rejected";
//    DB hanya punya cancelled). Ditolak tercakup oleh tab "Ditolak/Dibatalkan". ──
const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "pending", label: "Menunggu Persetujuan" },
  { key: "approved", label: "Belum Bayar" },
  { key: "menunggu_konfirmasi", label: "Menunggu Konfirmasi" },
  { key: "lunas", label: "Lunas" },
  { key: "cancelled", label: "Ditolak/Dibatalkan" },
  { key: "completed", label: "Selesai" },
];

function formatPrice(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function OwnerBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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
          .select("id, full_name, school_name, phone")
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
      setError(toReadableError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllBookings();
  }, []);

  async function handleStatus(id: string, status: "approved" | "cancelled" | "completed") {
    if (status === "cancelled") {
      setRejectTarget({ id, label: "booking" });
      setRejectReason("");
      return;
    }
    await doStatusUpdate(id, status);
  }

  async function doStatusUpdate(id: string, status: "approved" | "cancelled" | "completed", reason?: string) {
    setActionLoading(id);
    setError(null);
    try {
      const supabase = createClient();
      await updateBookingStatus(supabase, id, status, { rejectionReason: reason ?? null });
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

  // ── Stat cards — dihitung dari data yang sudah dimuat (bukan query baru) ──
  const total = bookings.length;
  const menunggu = bookings.filter((b) => getStatusKey(b) === "pending").length;
  const menungguKonfirmasi = bookings.filter(
    (b) => getStatusKey(b) === "menunggu_konfirmasi"
  ).length;

  const statCards = [
    {
      label: "Total Booking",
      value: total,
      icon: "event_available",
      iconCls: "text-tertiary bg-tertiary-fixed",
      cardCls: "bg-white rounded-xl card-shadow border border-outline-variant",
      valueCls: "text-primary",
    },
    {
      label: "Menunggu Persetujuan",
      value: menunggu,
      icon: "hourglass_top",
      iconCls: "text-secondary bg-secondary-container",
      cardCls: "bg-white rounded-2xl card-shadow border border-outline-variant border-l-4 border-l-secondary",
      valueCls: "text-secondary",
    },
    {
      label: "Menunggu Konfirmasi",
      value: menungguKonfirmasi,
      icon: "payments",
      iconCls: "text-primary bg-primary-fixed",
      cardCls: "bg-secondary/5 rounded-xl shadow-sm border border-outline-variant",
      valueCls: "text-tertiary-container",
    },
  ];

  return (
    <OwnerShell activePage="bookings">
      {/* ── Header hero gelap — pola konsisten Kelola Kos ── */}
      <section className="px-margin-mobile md:px-margin-desktop pt-6 md:pt-10 pb-2">
        <div className="relative overflow-hidden rounded-2xl bg-on-surface card-shadow">
          {/* Grid pattern halus — konsisten hero dashboard */}
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{
            backgroundImage:
              "linear-gradient(rgba(11,28,48,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(11,28,48,0.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }} />

          <div className="relative p-6 md:p-8">
            <div className="space-y-2">
              <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary-fixed backdrop-blur-sm">
                <span className="material-symbols-outlined !text-sm">event_note</span>
                Permintaan Booking
              </p>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white text-balance">
                Kelola Booking Masuk
              </h1>
              <p className="text-sm md:text-base text-white/70 max-w-md leading-relaxed">
                Tinjau, setujui, atau tolak permintaan booking dan konfirmasi pembayaran siswa.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stat cards — hierarki radius/shadow beda per kartu (pola Kelola Kos) ── */}
      <div className="px-margin-mobile md:px-margin-desktop py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {statCards.map((card) => (
            <div
              key={card.label}
              className={`p-stack-md flex flex-col justify-between h-32 ${card.cardCls}`}
            >
              <div className="flex justify-between items-start">
                <span className="font-label-md text-on-surface-variant uppercase tracking-wider">
                  {card.label}
                </span>
                <span className={`material-symbols-outlined p-2 rounded-lg ${card.iconCls}`}>
                  {card.icon}
                </span>
              </div>
              <p className={`font-headline-md text-headline-md font-bold ${card.valueCls}`}>
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Filter tabs — 7 tab (rejected dihapus) ── */}
        <div className="mt-8 flex flex-wrap gap-2">
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

        {/* ── Daftar booking ── */}
        {loading ? (
          <div className="space-y-4 mt-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl card-shadow border border-outline-variant p-5 animate-pulse"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-1/2 bg-surface-container-high rounded-full" />
                    <div className="h-3 w-1/3 bg-surface-container-high rounded-full" />
                  </div>
                  <div className="h-6 w-32 bg-surface-container-high rounded-full shrink-0" />
                </div>
                <div className="h-9 w-full bg-surface-container-high rounded-xl mt-5" />
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="mt-4 rounded-3xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-outline block mb-3">calendar_month</span>
            <h3 className="font-title-lg text-title-lg text-on-surface font-bold">
              Belum ada permintaan booking
            </h3>
            <p className="text-body-md text-on-surface-variant mt-1 max-w-sm mx-auto">
              Permintaan booking dari siswa akan muncul di sini.
            </p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="mt-4 rounded-3xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-outline block mb-3">inbox</span>
            <h3 className="font-title-lg text-title-lg text-on-surface font-bold">
              Tidak ada booking yang sesuai filter
            </h3>
            <p className="text-body-md text-on-surface-variant mt-1 max-w-sm mx-auto">
              Coba pilih filter lain.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
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
              const isPaid = b.payment_status === "lunas";

              return (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl card-shadow border border-outline-variant overflow-hidden transition-shadow hover:card-shadow-hover"
                >
                  {/* Body */}
                  <div className="p-5 md:p-6 flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="font-title-lg text-title-lg text-on-surface truncate">
                          {b.student?.full_name ?? "User"}
                        </p>
                        <span className="text-on-surface-variant text-body-md">—</span>
                        <span className="text-body-md text-on-surface font-medium truncate">
                          {b.rooms?.kos?.name}
                        </span>
                      </div>
                      <p className="text-body-sm text-on-surface-variant flex flex-wrap items-center gap-x-2">
                        {b.student?.school_name && (
                          <span className="inline-flex items-center gap-1">
                            <span className="material-symbols-outlined !text-[14px]">school</span>
                            {b.student.school_name}
                          </span>
                        )}
                        {b.student?.phone && (
                          <span className="inline-flex items-center gap-1">
                            <span className="material-symbols-outlined !text-[14px]">call</span>
                            <a href={`https://wa.me/${b.student.phone}`} className="hover:underline" target="_blank" rel="noopener noreferrer">{b.student.phone}</a>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined !text-[14px]">meeting_room</span>
                          Kamar {b.rooms?.room_number}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined !text-[14px]">payments</span>
                          {b.rooms?.price_per_month ? formatPrice(b.rooms.price_per_month) : "—"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined !text-[14px]">event</span>
                          {new Date(b.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </p>
                      {b.notes && (
                        <p className="text-xs text-outline bg-surface-container-low rounded-lg px-3 py-2 mt-2">
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

                  {/* Aksi */}
                  {(isPending || isApproved) && (
                    <div className="px-5 md:px-6 py-4 flex flex-wrap gap-2 border-t border-outline-variant bg-surface-container-low/50">
                      {isPending && (
                        <>
                          <button
                            onClick={() => handleStatus(b.id, "approved")}
                            disabled={actionLoading === b.id}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="material-symbols-outlined !text-[18px]">check_circle</span>
                            {actionLoading === b.id ? "Memproses..." : "Konfirmasi"}
                          </button>
                          <button
                            onClick={() => handleStatus(b.id, "cancelled")}
                            disabled={actionLoading === b.id}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-error text-white rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="material-symbols-outlined !text-[18px]">cancel</span>
                            {actionLoading === b.id ? "Memproses..." : "Tolak"}
                          </button>
                        </>
                      )}

                      {isApproved && !isWaitingConfirm && (
                        <>
                          {isPaid ? (
                            <button
                              onClick={() => handleStatus(b.id, "completed")}
                              disabled={actionLoading === b.id}
                              className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary text-white rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="material-symbols-outlined !text-[18px]">task_alt</span>
                              {actionLoading === b.id ? "Memproses..." : "Tandai Selesai"}
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface-variant text-sm font-bold">
                              <span className="material-symbols-outlined !text-[18px]">lock</span>
                              Menunggu pembayaran siswa
                            </span>
                          )}
                          <button
                            onClick={() => handleStatus(b.id, "cancelled")}
                            disabled={actionLoading === b.id}
                            className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-error text-error rounded-xl font-bold text-sm hover:bg-error/5 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="material-symbols-outlined !text-[18px]">cancel</span>
                            {actionLoading === b.id ? "Memproses..." : "Batalkan"}
                          </button>
                        </>
                      )}

                      {isApproved && isWaitingConfirm && (
                        <>
                          {isManual && (
                            <button
                              onClick={() => handleConfirmPayment(b.id)}
                              disabled={actionLoading === b.id}
                              className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary text-white rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="material-symbols-outlined !text-[18px]">verified</span>
                              {actionLoading === b.id ? "Memproses..." : "Konfirmasi Pembayaran"}
                            </button>
                          )}
                          <button
                            onClick={() => handleStatus(b.id, "cancelled")}
                            disabled={actionLoading === b.id}
                            className="inline-flex items-center gap-2 px-5 py-2.5 border-2 border-error text-error rounded-xl font-bold text-sm hover:bg-error/5 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="material-symbols-outlined !text-[18px]">cancel</span>
                            {actionLoading === b.id ? "Memproses..." : "Batalkan"}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
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

      {/* Modal alasan tolak */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setRejectTarget(null)}>
          <div className="bg-white rounded-2xl card-shadow p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-title-lg text-title-lg text-on-surface font-bold mb-1">Tolak Booking?</h3>
            <p className="text-body-sm text-on-surface-variant mb-4">
              Beri alasan agar siswa tahu kenapa ditolak (opsional).
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Contoh: kamar sudah terisi, harga kurang sesuai..."
              className="w-full rounded-lg border border-outline-variant px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => {
                  const id = rejectTarget.id;
                  setRejectTarget(null);
                  doStatusUpdate(id, "cancelled", rejectReason);
                }}
                disabled={actionLoading === rejectTarget.id}
                className="flex-1 py-2.5 bg-error text-white rounded-xl font-bold text-sm hover:brightness-110 transition disabled:opacity-50"
              >
                {actionLoading === rejectTarget.id ? "Memproses..." : "Tolak Booking"}
              </button>
              <button
                onClick={() => setRejectTarget(null)}
                className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant rounded-xl font-bold text-sm hover:bg-surface-container-low transition"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </OwnerShell>
  );
}
