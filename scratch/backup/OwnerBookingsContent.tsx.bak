"use client";

import { useState } from "react";
import Link from "next/link";
import { updateBookingStatus } from "@/lib/supabase/queries";
import { confirmPayment } from "@/lib/supabase/queries";
import { getSignedProofUrl } from "@/lib/supabase/queries";
import { toastSuccess, toastError } from "@/lib/toast";
import { toReadableError } from "@/lib/utils";

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
}

interface OwnerBookingsContentProps {
  bookings: Booking[];
  stats: Stats;
  availableRooms: number;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  statusFilter: string;
  searchQuery: string;
  basePath: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatBookingId(id: string): string {
  return `#SL-${id.slice(-4).toUpperCase()}`;
}

export default function OwnerBookingsContent({
  bookings,
  stats,
  availableRooms,
  totalCount,
  currentPage,
  totalPages,
  statusFilter,
  searchQuery,
  basePath,
}: OwnerBookingsContentProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localStatusFilter, setLocalStatusFilter] = useState(statusFilter);

  async function handleAction(bookingId: string, status: "approved" | "cancelled") {
    setActionLoading(bookingId);
    setError(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const result = await updateBookingStatus(supabase, bookingId, status);
      if (!result) throw new Error("Booking tidak ditemukan atau tidak memiliki izin");
      window.location.reload();
    } catch (err: any) {
      const readable = toReadableError(err);
      setError(readable);
      setActionLoading(null);
      toastError("Gagal memproses booking: " + readable);
    }
  }

  async function handleConfirmPayment(bookingId: string) {
    setActionLoading(bookingId);
    setError(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await confirmPayment(supabase, bookingId);
      toastSuccess("Pembayaran dikonfirmasi. Status booking: Lunas.");
      window.location.reload();
    } catch (err: any) {
      setError(toReadableError(err));
      setActionLoading(null);
      toastError("Gagal konfirmasi pembayaran: " + toReadableError(err));
    }
  }

  async function handleViewProof(proofPath: string) {
    setActionLoading("view:" + proofPath);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const url = await getSignedProofUrl(supabase, proofPath, 3600);
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        toastError("Bukti transfer tidak ditemukan");
      }
    } catch (err: any) {
      toastError("Gagal memuat bukti transfer: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setActionLoading(null);
    }
  }

  const filteredBookings = localStatusFilter === "all"
    ? bookings
    : bookings.filter((b) => b.status === localStatusFilter);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 fixed left-0 top-0 h-screen px-stack-md border-r border-outline-variant bg-surface-container-low z-40 pt-6 pb-8">
        <div className="mb-stack-lg px-4">
          <h2 className="font-headline-md text-headline-md text-primary font-bold">
            Student Portal
          </h2>
          <p className="text-body-sm text-on-surface-variant">
            Find your next home
          </p>
        </div>
        <nav className="flex-1 space-y-2">
          <Link
            href="/owner/search"
            className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all"
          >
            <span className="material-symbols-outlined">search</span>
            <span className="font-label-md text-label-md">Search</span>
          </Link>
          <Link
            href="/owner/favorites"
            className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all"
          >
            <span className="material-symbols-outlined">favorite</span>
            <span className="font-label-md text-label-md">Favorites</span>
          </Link>
          <Link
            href="/owner"
            className="flex items-center gap-3 px-4 py-3 bg-secondary-container text-on-secondary-container rounded-lg font-bold transition-all"
          >
            <span className="material-symbols-outlined">receipt_long</span>
            <span className="font-label-md text-label-md">My Bookings</span>
          </Link>
          <Link
            href="/owner/profile"
            className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all"
          >
            <span className="material-symbols-outlined">person</span>
            <span className="font-label-md text-label-md">Profile</span>
          </Link>
        </nav>
        <div className="mt-auto space-y-2 border-t border-outline-variant pt-stack-md">
          <Link
            href="/owner/settings"
            className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all"
          >
            <span className="material-symbols-outlined">settings</span>
            <span className="font-label-md text-label-md">Settings</span>
          </Link>
          <Link
            href="/logout"
            className="flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all"
          >
            <span className="material-symbols-outlined text-error">logout</span>
            <span className="font-label-md text-label-md">Logout</span>
          </Link>
        </div>
      </aside>

      {/* Main Canvas */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* TopAppBar */}
        <header className="sticky top-0 z-50 flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-stack-sm bg-surface shadow-sm transition-all duration-300">
          <div className="flex items-center gap-stack-md">
            <span className="lg:hidden material-symbols-outlined text-primary cursor-pointer">
              menu
            </span>
            <h1 className="font-headline-md text-headline-md font-bold text-primary">
              NetsU
            </h1>
          </div>
          <div className="flex items-center gap-stack-md">
            <div className="hidden md:flex items-center bg-surface-container px-4 py-2 rounded-full border border-outline-variant">
              <span className="material-symbols-outlined text-on-surface-variant mr-2">
                search
              </span>
              <input
                className="bg-transparent border-none focus:ring-0 text-body-sm w-48 lg:w-64"
                placeholder="Search bookings..."
                type="text"
                defaultValue={searchQuery}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const v = (e.target as HTMLInputElement).value;
                    window.location.href = `${basePath}?search=${encodeURIComponent(v)}`;
                  }
                }}
              />
            </div>
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-primary cursor-pointer p-2 hover:bg-primary-container rounded-full transition-colors">
                notifications
              </span>
              <span className="material-symbols-outlined text-primary cursor-pointer p-2 hover:bg-primary-container rounded-full transition-colors">
                help
              </span>
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-container">
                <img
                  className="w-full h-full object-cover"
                  src="/images/avatar-placeholder.svg"
                  alt="Avatar"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-margin-mobile md:p-margin-desktop pb-32">
          {/* Header */}
          <div className="mb-stack-lg">
            <h2 className="font-headline-lg text-headline-lg text-primary">
              Booking Masuk
            </h2>
            <p className="text-body-md text-on-surface-variant">
              Kelola permintaan pemesanan kamar dari calon mahasiswa Anda.
            </p>
          </div>

          {/* Stats Cards */}
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
                  Total Disetujui (Bulan Ini)
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
                  {availableRooms}
                </p>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(30,58,138,0.05)] overflow-hidden border border-outline-variant/30">
            {/* Filter Header */}
            <div className="px-stack-md py-4 border-b border-outline-variant flex flex-col sm:flex-row justify-between items-center gap-4 bg-surface-container-lowest">
              <div className="flex gap-2">
                <button
                  onClick={() => setLocalStatusFilter("all")}
                  className={`px-4 py-1.5 rounded-full text-label-md font-bold transition-colors ${
                    localStatusFilter === "all"
                      ? "bg-primary-container text-white"
                      : "hover:bg-surface-container text-on-surface-variant font-semibold"
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setLocalStatusFilter("pending")}
                  className={`px-4 py-1.5 rounded-full text-label-md font-bold transition-colors ${
                    localStatusFilter === "pending"
                      ? "bg-primary-container text-white"
                      : "hover:bg-surface-container text-on-surface-variant font-semibold"
                  }`}
                >
                  Terbaru
                </button>
              </div>
              <div className="flex items-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-sm">
                  filter_list
                </span>
                <span className="font-label-md">Filter Urutan</span>
              </div>
            </div>

            {error && (
              <div className="px-6 py-3 text-sm text-error bg-error-container/20">
                {error}
              </div>
            )}

            <div className="overflow-x-auto">
              {filteredBookings.length === 0 ? (
                <div className="p-12 text-center">
                  <span className="material-symbols-outlined text-4xl text-outline block mb-2">
                    inbox
                  </span>
                  <p className="text-on-surface-variant font-body-md text-body-md">
                    Tidak ada booking yang sesuai.
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
                        Tipe Kamar
                      </th>
                      <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                        Tgl Masuk
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
                    {filteredBookings.map((b) => {
                      const isProcessed =
                        b.status === "approved" || b.status === "cancelled";
                      const imgSrc =
                        b.student?.avatar_url || "/images/avatar-placeholder.svg";

                      return (
                        <tr
                          key={b.id}
                          className={`hover:bg-surface-container-low transition-colors group ${
                            isProcessed ? "bg-surface-container-low/50" : ""
                          }`}
                        >
                          {/* Mahasiswa */}
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
                                  {b.student?.school_name ?? "Sekolah"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Tipe Kamar */}
                          <td className="px-6 py-5">
                            <p
                              className={`font-label-md font-bold ${
                                isProcessed
                                  ? "text-on-surface-variant"
                                  : "text-on-surface"
                              }`}
                            >
                              {b.rooms?.room_number ?? "-"}
                            </p>
                            <p className="text-body-sm text-on-surface-variant">
                              {b.rooms?.kos?.name ?? "-"}
                            </p>
                          </td>

                          {/* Tgl Masuk */}
                          <td className="px-6 py-5">
                            <p className="text-body-sm text-on-surface">
                              {b.move_in_date
                                ? formatDate(b.move_in_date)
                                : formatDate(b.created_at)}
                            </p>
                          </td>

                          {/* Catatan */}
                          <td className="px-6 py-5 max-w-xs">
                            <p className="text-body-sm text-on-surface-variant line-clamp-2 italic">
                              {b.notes || "N/A"}
                            </p>
                          </td>

                          {/* Status/Aksi */}
                          <td className="px-6 py-5">
                            {b.status === "pending" ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleAction(b.id, "approved")}
                                  disabled={actionLoading === b.id}
                                  className="bg-primary hover:bg-primary-container px-4 py-2 rounded-lg text-white text-label-md font-bold transition-all transform active:scale-95 shadow-sm disabled:opacity-50"
                                >
                                  {actionLoading === b.id ? "..." : "Konfirmasi"}
                                </button>
                                <button
                                  onClick={() => handleAction(b.id, "cancelled")}
                                  disabled={actionLoading === b.id}
                                  className="border border-error text-error hover:bg-error-container px-4 py-2 rounded-lg text-label-md font-bold transition-all transform active:scale-95 disabled:opacity-50"
                                >
                                  {actionLoading === b.id ? "..." : "Tolak"}
                                </button>
                              </div>
                            ) : b.status === "approved" ? (
                              <div className="flex flex-col items-end gap-2">
                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary/10 text-secondary text-label-md font-bold">
                                  <span
                                    className="material-symbols-outlined text-[14px] mr-1"
                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                  >
                                    check_circle
                                  </span>
                                  Disetujui
                                </span>
                                {(b as any).payment_status === "menunggu_konfirmasi" && (b as any).payment_method !== "midtrans" && (
                                  <div className="flex items-center gap-2">
                                    {(b as any).payment_proof_path && (
                                      <button
                                        onClick={() => handleViewProof((b as any).payment_proof_path)}
                                        disabled={actionLoading === "view:" + (b as any).payment_proof_path}
                                        className="border border-primary text-primary hover:bg-primary/10 px-3 py-2 rounded-lg text-label-md font-bold transition-all disabled:opacity-50"
                                      >
                                        <span className="material-symbols-outlined text-sm align-middle mr-1">image</span>
                                        Lihat Bukti
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleConfirmPayment(b.id)}
                                      disabled={actionLoading === b.id}
                                      className="bg-secondary hover:brightness-110 px-4 py-2 rounded-lg text-white text-label-md font-bold transition-all transform active:scale-95 shadow-sm disabled:opacity-50"
                                    >
                                      {actionLoading === b.id ? "..." : "Konfirmasi Pembayaran"}
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full bg-error/10 text-error text-label-md font-bold">
                                <span
                                  className="material-symbols-outlined text-[14px] mr-1"
                                  style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                  cancel
                                </span>
                                Ditolak
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
                <span className="font-bold">{filteredBookings.length}</span> dari{" "}
                <span className="font-bold">{totalCount}</span> booking
              </p>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <Link
                    href={`${basePath}?page=${currentPage - 1}&status=${statusFilter}&search=${searchQuery}`}
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
                      href={`${basePath}?page=${p}&status=${statusFilter}&search=${searchQuery}`}
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
                    href={`${basePath}?page=${currentPage + 1}&status=${statusFilter}&search=${searchQuery}`}
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

        {/* BottomNav Mobile */}
        <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 bg-surface shadow-[0_-4px_20px_rgba(30,58,138,0.05)] rounded-t-xl transition-all">
          <Link
            href="/owner/search"
            className="flex flex-col items-center justify-center text-on-surface-variant p-2"
          >
            <span className="material-symbols-outlined">search</span>
            <span className="font-label-md text-[10px]">Search</span>
          </Link>
          <Link
            href="/owner/favorites"
            className="flex flex-col items-center justify-center text-on-surface-variant p-2"
          >
            <span className="material-symbols-outlined">favorite</span>
            <span className="font-label-md text-[10px]">Favorites</span>
          </Link>
          <Link
            href="/owner"
            className="flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-full px-4 py-1 scale-95 transition-transform"
          >
            <span className="material-symbols-outlined">receipt_long</span>
            <span className="font-label-md text-[10px]">Bookings</span>
          </Link>
          <Link
            href="/owner/profile"
            className="flex flex-col items-center justify-center text-on-surface-variant p-2"
          >
            <span className="material-symbols-outlined">person</span>
            <span className="font-label-md text-[10px]">Profile</span>
          </Link>
        </nav>

        {/* Footer */}
        <footer className="w-full py-stack-lg px-margin-mobile md:px-margin-desktop grid grid-cols-1 md:grid-cols-3 gap-gutter bg-surface-container-highest border-t border-outline-variant">
          <div className="space-y-stack-sm">
            <h3 className="font-title-lg text-title-lg font-bold text-primary">
              NetsU
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Solusi hunian modern untuk mahasiswa masa kini. Menghubungkan
              kenyamanan dan kemudahan.
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-4">
              &copy; 2024 NetsU. Academic Reliability &amp;
              Community Warmth.
            </p>
          </div>
          <div className="space-y-stack-sm">
            <h4 className="font-label-md text-label-md uppercase tracking-wider text-primary">
              Quick Links
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#"
                  className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors hover:underline decoration-primary"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors hover:underline decoration-primary"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors hover:underline decoration-primary"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-stack-sm">
            <h4 className="font-label-md text-label-md uppercase tracking-wider text-primary">
              Support
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="#"
                  className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors hover:underline decoration-primary"
                >
                  Contact Support
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors hover:underline decoration-primary"
                >
                  Partner with Us
                </Link>
              </li>
              <li className="flex items-center gap-2 mt-4">
                <span className="material-symbols-outlined text-primary">
                  mail
                </span>
                <span className="text-body-sm">hello@netsu.id</span>
              </li>
            </ul>
          </div>
        </footer>
      </div>
    </div>
  );
}
