"use client";

import { useState } from "react";
import Link from "next/link";
import {
  adminOverrideBookingStatus,
} from "@/lib/supabase/queries";
import { toReadableError } from "@/lib/utils";
import AdminShell from "@/components/layout/AdminShell";

interface Student {
  full_name?: string;
  school_name?: string;
  avatar_url?: string;
}

interface Room {
  room_number?: string;
  price_per_month?: number;
  kos?: { id: string; name?: string };
}

interface Booking {
  id: string;
  status: string;
  created_at: string;
  move_in_date?: string;
  notes?: string;
  student?: Student | null;
  rooms?: Room | null;
}

interface Stats {
  pending: number;
  approvedThisMonth: number;
  availableRooms: number;
}

interface Props {
  bookings: Booking[];
  stats: Stats;
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminBookingsContent({
  bookings,
  stats,
  totalCount,
  currentPage,
  totalPages,
}: Props) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Modal override darurat (admin ubah status booking) ───
  const [overrideTarget, setOverrideTarget] = useState<{
    id: string;
    name: string;
    newStatus: "approved" | "cancelled" | "completed" | "pending" | "rejected";
  } | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  async function submitOverride() {
    if (!overrideTarget) return;
    setOverrideSubmitting(true);
    setError(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await adminOverrideBookingStatus(
        supabase,
        overrideTarget.id,
        overrideTarget.newStatus,
        overrideReason
      );
      setOverrideTarget(null);
      setOverrideReason("");
      window.location.reload();
    } catch (err: unknown) {
      setError(toReadableError(err));
      setOverrideSubmitting(false);
    }
  }

  function openOverride(b: Booking, status: "approved" | "cancelled" | "completed") {
    setOverrideTarget({
      id: b.id,
      name: b.student?.full_name ?? "Mahasiswa",
      newStatus: status,
    });
    setOverrideReason("");
    setError(null);
  }

  const statusLabel: Record<string, string> = {
    pending: "Menunggu",
    approved: "Disetujui",
    cancelled: "Ditolak",
    rejected: "Ditolak",
    completed: "Selesai",
  };

  const statusStyle: Record<string, string> = {
    pending: "bg-on-tertiary-container/10 text-on-tertiary-container",
    approved: "bg-secondary/10 text-secondary",
    cancelled: "bg-error/10 text-error",
    rejected: "bg-error/10 text-error",
    completed: "bg-primary-container text-on-primary-container",
  };

  return (
    <AdminShell activePage="bookings">
      <main className="p-margin-mobile md:p-margin-desktop pb-32">
        <div className="flex items-start justify-between mb-stack-lg flex-wrap gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight">
              Booking Masuk
            </h1>
            <p className="text-sm font-normal text-on-surface-variant mt-1 leading-relaxed">
              Kelola seluruh permintaan pemesanan kamar di platform.
            </p>
          </div>
          <Link
            href="/admin/overrides"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 hover:bg-primary/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">
              history
            </span>
            Riwayat Override Admin
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-stack-lg">
          <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-[0_4px_20px_rgba(30,58,138,0.05)] border border-outline-variant/30 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary-container">
                pending_actions
              </span>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-outline mb-0.5">
                Menunggu Konfirmasi
              </p>
              <p className="text-2xl font-extrabold text-primary tracking-tight">
                {stats.pending}
              </p>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-[0_4px_20px_rgba(30,58,138,0.05)] border border-outline-variant/30 flex items-center gap-4">
            <div className="w-12 h-12 bg-secondary-container rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-on-secondary-container">
                check_circle
              </span>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-outline mb-0.5">
                Disetujui (Bulan Ini)
              </p>
              <p className="text-2xl font-extrabold text-primary tracking-tight">
                {stats.approvedThisMonth}
              </p>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-[0_4px_20px_rgba(30,58,138,0.05)] border border-outline-variant/30 flex items-center gap-4">
            <div className="w-12 h-12 bg-tertiary-fixed rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-on-tertiary-fixed">
                home_work
              </span>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-outline mb-0.5">
                Kamar Tersedia
              </p>
              <p className="text-2xl font-extrabold text-primary tracking-tight">
                {stats.availableRooms}
              </p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(30,58,138,0.05)] overflow-hidden border border-outline-variant/30">
          {error && (
            <div className="px-6 py-3 text-sm text-error bg-error-container/20">
              {error}
            </div>
          )}
          <div className="overflow-x-auto">
            {bookings.length === 0 ? (
              <div className="p-12 text-center">
                <span className="material-symbols-outlined text-4xl text-outline block mb-2">
                  inbox
                </span>
                <p className="text-on-surface-variant font-body-md text-body-md">
                  Belum ada booking.
                </p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                      Mahasiswa
                    </th>
                    <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                      Properti
                    </th>
                    <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                      Tgl
                    </th>
                    <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                      Catatan
                    </th>
                    <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                      Status/Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {bookings.map((b) => {
                    const isProcessed =
                      b.status === "approved" ||
                      b.status === "cancelled" ||
                      b.status === "completed";
                    const imgSrc =
                      b.student?.avatar_url || "/images/avatar-placeholder.svg";

                    return (
                      <tr
                        key={b.id}
                        className={`hover:bg-surface-container-low transition-colors group ${
                          isProcessed ? "bg-surface-container-low/50" : ""
                        }`}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full overflow-hidden bg-surface-container-high border border-outline-variant ${
                                isProcessed ? "grayscale opacity-70" : ""
                              }`}
                            >
                              <img
                                className="w-full h-full object-cover"
                                src={imgSrc}
                                alt={b.student?.full_name ?? "Student"}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    "/images/avatar-placeholder.svg";
                                }}
                              />
                            </div>
                            <div>
                              <p
                                className={`font-title-lg text-body-md font-bold ${
                                  isProcessed
                                    ? "text-on-surface-variant"
                                    : "text-primary"
                                }`}
                              >
                                {b.student?.full_name ?? "Mahasiswa"}
                              </p>
                              <p className="text-body-sm text-on-surface-variant">
                                {b.student?.school_name ?? "-"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <p
                            className={`font-label-md font-bold ${
                              isProcessed
                                ? "text-on-surface-variant"
                                : "text-on-surface"
                            }`}
                          >
                            {b.rooms?.kos?.name ?? "-"}
                          </p>
                          <p className="text-body-sm text-on-surface-variant">
                            {b.rooms?.room_number ?? "-"}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <p className="text-body-sm text-on-surface">
                            {b.move_in_date
                              ? formatDate(b.move_in_date)
                              : formatDate(b.created_at)}
                          </p>
                        </td>

                        <td className="px-6 py-5 max-w-xs">
                          <p className="text-body-sm text-on-surface-variant line-clamp-2 italic">
                            {b.notes || "N/A"}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          {b.status === "pending" ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openOverride(b, "approved")}
                                disabled={actionLoading === b.id}
                                className="bg-primary hover:bg-primary-container px-4 py-2 rounded-lg text-white text-label-md font-bold transition-all transform active:scale-95 shadow-sm disabled:opacity-50"
                              >
                                {actionLoading === b.id
                                  ? "..."
                                  : "Konfirmasi"}
                              </button>
                              <button
                                onClick={() => openOverride(b, "cancelled")}
                                disabled={actionLoading === b.id}
                                className="border border-error text-error hover:bg-error-container px-4 py-2 rounded-lg text-label-md font-bold transition-all transform active:scale-95 disabled:opacity-50"
                              >
                                {actionLoading === b.id ? "..." : "Tolak"}
                              </button>
                            </div>
                          ) : (
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-label-md font-bold ${
                                statusStyle[b.status] ?? ""
                              }`}
                            >
                              <span
                                className="material-symbols-outlined text-[14px] mr-1"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                {b.status === "approved"
                                  ? "check_circle"
                                  : b.status === "cancelled"
                                    ? "cancel"
                                    : "task_alt"}
                              </span>
                              {statusLabel[b.status] ?? b.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 flex justify-between items-center border-t border-outline-variant bg-surface-container-lowest">
            <p className="text-body-sm text-on-surface-variant">
              Menampilkan{" "}
              <span className="font-bold">{bookings.length}</span> dari{" "}
              <span className="font-bold">{totalCount}</span> booking
            </p>
            <div className="flex gap-2">
              {currentPage > 1 && (
                <Link
                  href={`/admin/bookings?page=${currentPage - 1}`}
                  className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant hover:bg-surface-container-high transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">
                    chevron_left
                  </span>
                </Link>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - currentPage) <= 2
                )
                .map((p) => (
                  <Link
                    key={p}
                    href={`/admin/bookings?page=${p}`}
                    className={`w-8 h-8 flex items-center justify-center rounded text-sm font-bold transition-colors ${
                      p === currentPage
                        ? "bg-primary text-white shadow-sm"
                        : "border border-outline-variant hover:bg-surface-container-high"
                    }`}
                  >
                    {p}
                  </Link>
                ))}
              {currentPage < totalPages && (
                <Link
                  href={`/admin/bookings?page=${currentPage + 1}`}
                  className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant hover:bg-surface-container-high transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">
                    chevron_right
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ─── MODAL OVERRIDE DARURAT ─── */}
      {overrideTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border-2 border-warning/70 overflow-hidden">
            {/* Header warning */}
            <div className="px-6 py-4 bg-warning/10 border-b border-warning/30 flex items-start gap-3">
              <span className="material-symbols-outlined text-warning text-2xl mt-0.5">
                warning
              </span>
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface font-bold">
                  Override Status Booking — Darurat
                </h3>
                <p className="text-body-sm text-on-surface-variant">
                  Tindakan ini{" "}
                  <span className="font-bold">hanya untuk kasus darurat</span>.
                  Akan tercatat di audit log &amp; pemilik kos diberi tahu.
                </p>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="text-sm">
                <p className="text-on-surface-variant">
                  Booking: <span className="font-bold">{overrideTarget.name}</span>{" "}
                  <span className="text-xs text-on-surface-variant/70">
                    ({overrideTarget.id.slice(0, 8)}...)
                  </span>
                </p>
                <p className="mt-1 text-on-surface-variant">
                  Status baru:{" "}
                  <span className="font-bold text-primary">
                    {statusLabel[overrideTarget.newStatus] ?? overrideTarget.newStatus}
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-on-surface mb-1.5">
                  Alasan override (wajib, min 20 karakter)
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={3}
                  placeholder="Contoh: Pemilik tidak merespon selama 7 hari & siswa sudah membayar via transfer, perlu disetujui manual..."
                  className="w-full border border-outline-variant rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                />
                <p
                  className={`text-xs mt-1 ${
                    overrideReason.trim().length >= 20
                      ? "text-secondary"
                      : "text-error"
                  }`}
                >
                  {overrideReason.trim().length}/20 karakter{" "}
                  {overrideReason.trim().length < 20
                    ? "— alasan terlalu pendek"
                    : "✓ cukup"}
                </p>
              </div>

              {error && (
                <div className="text-sm text-error bg-error-container/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-2 bg-warning/10 rounded-lg border border-warning/30 px-3 py-2.5">
                <span className="material-symbols-outlined text-warning text-lg">
                  visibility
                </span>
                <p className="text-xs text-on-surface-variant">
                  Owner kos akan menerima notifikasi. Riwayat tercatat di{" "}
                  <span className="font-bold">Admin Action Log</span>.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-surface-container-lowest flex justify-end gap-3 border-t border-outline-variant">
              <button
                onClick={() => {
                  setOverrideTarget(null);
                  setOverrideReason("");
                }}
                disabled={overrideSubmitting}
                className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-sm font-bold hover:bg-surface-container-high transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={submitOverride}
                disabled={
                  overrideSubmitting || overrideReason.trim().length < 20
                }
                className="px-4 py-2 rounded-lg bg-error text-white text-sm font-bold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {overrideSubmitting
                  ? "Memproses..."
                  : "Konfirmasi Override Darurat"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
