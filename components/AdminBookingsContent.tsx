"use client";

import { useState } from "react";
import Link from "next/link";
import { updateBookingStatus } from "@/lib/supabase/queries";
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

  async function handleAction(
    bookingId: string,
    status: "approved" | "cancelled" | "completed"
  ) {
    setActionLoading(bookingId);
    setError(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const result = await updateBookingStatus(supabase, bookingId, status);
      if (!result) throw new Error("Booking tidak ditemukan atau tidak memiliki izin");
      window.location.reload();
    } catch (err: any) {
      setError(toReadableError(err));
      setActionLoading(null);
    }
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
          <div className="mb-stack-lg">
            <h2 className="font-headline-lg text-headline-lg text-primary">
              Booking Masuk
            </h2>
            <p className="text-body-md text-on-surface-variant">
              Kelola seluruh permintaan pemesanan kamar di platform.
            </p>
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
                <p className="text-label-md text-on-surface-variant">
                  Menunggu Konfirmasi
                </p>
                <p className="font-headline-md text-headline-md text-primary">
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
                <p className="text-label-md text-on-surface-variant">
                  Disetujui (Bulan Ini)
                </p>
                <p className="font-headline-md text-headline-md text-primary">
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
                <p className="text-label-md text-on-surface-variant">
                  Kamar Tersedia
                </p>
                <p className="font-headline-md text-headline-md text-primary">
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
                                  onClick={() =>
                                    handleAction(b.id, "approved")
                                  }
                                  disabled={actionLoading === b.id}
                                  className="bg-primary hover:bg-primary-container px-4 py-2 rounded-lg text-white text-label-md font-bold transition-all transform active:scale-95 shadow-sm disabled:opacity-50"
                                >
                                  {actionLoading === b.id
                                    ? "..."
                                    : "Konfirmasi"}
                                </button>
                                <button
                                  onClick={() =>
                                    handleAction(b.id, "cancelled")
                                  }
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
    </AdminShell>
  );
}

