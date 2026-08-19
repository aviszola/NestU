"use client";

import { useState } from "react";
import AdminShell from "@/components/layout/AdminShell";
import { createClient } from "@/lib/supabase/client";
import { markRefundProcessed } from "@/lib/supabase/queries";

interface RefundBooking {
  id: string;
  student_id: string;
  total_amount?: number | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  refund_processed_at?: string | null;
  rooms?: {
    room_number?: string;
    price_per_month?: number;
    kos?: { id?: string; name?: string };
  } | null;
  student?: { full_name?: string; phone?: string } | null;
}

function formatPrice(n?: number | null): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n ?? 0);
}

function formatDate(d?: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminRefundsContent({
  pending,
  processed,
}: {
  pending: RefundBooking[];
  processed: RefundBooking[];
}) {
  const [tab, setTab] = useState<"pending" | "processed">("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function handleProcess(id: string) {
    setActionLoading(id);
    try {
      const supabase = createClient();
      await markRefundProcessed(supabase, id);
      setToast("Refund ditandai sudah diproses. Notifikasi terkirim ke siswa.");
      // refresh list setelah aksi
      window.location.reload();
    } catch (err: any) {
      setToast(err.message ?? "Gagal memproses refund.");
    } finally {
      setActionLoading(null);
    }
  }

  const list = tab === "pending" ? pending : processed;

  return (
    <AdminShell activePage="refunds">
      <section className="px-margin-mobile md:px-margin-desktop pt-6 md:pt-10 pb-2">
        <div className="relative overflow-hidden rounded-2xl bg-on-surface card-shadow">
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(rgba(11,28,48,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(11,28,48,0.6) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="relative p-6 md:p-8">
            <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary-fixed backdrop-blur-sm">
              <span className="material-symbols-outlined !text-sm">payments</span>
              Refund Management
            </p>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white text-balance">
              Kelola Refund
            </h1>
            <p className="text-sm md:text-base text-white/70 max-w-md leading-relaxed">
              Proses refund manual untuk booking yang dibatalkan setelah pembayaran lunas.
            </p>
          </div>
        </div>
      </section>

      <div className="px-margin-mobile md:px-margin-desktop py-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setTab("pending")}
            className={`px-4 py-1.5 rounded-full text-label-md font-bold transition-colors ${
              tab === "pending"
                ? "bg-primary-container text-on-primary-container"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            Menunggu Diproses ({pending.length})
          </button>
          <button
            onClick={() => setTab("processed")}
            className={`px-4 py-1.5 rounded-full text-label-md font-bold transition-colors ${
              tab === "processed"
                ? "bg-primary-container text-on-primary-container"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            Riwayat Diproses ({processed.length})
          </button>
        </div>

        {toast && (
          <div className="mb-4 rounded-lg bg-secondary/10 text-secondary p-3 text-sm font-medium">
            {toast}
          </div>
        )}

        {list.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-outline block mb-3">
              {tab === "pending" ? "payments" : "verified"}
            </span>
            <h3 className="font-title-lg text-title-lg text-on-surface font-bold">
              {tab === "pending"
                ? "Tidak ada refund menunggu"
                : "Belum ada refund diproses"}
            </h3>
            <p className="text-body-md text-on-surface-variant mt-1 max-w-sm mx-auto">
              {tab === "pending"
                ? "Booking lunas yang dibatalkan akan muncul di sini."
                : "Refund yang sudah diproses akan tampil di sini untuk audit."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {list.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-2xl card-shadow border border-outline-variant overflow-hidden"
              >
                <div className="p-5 md:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <p className="font-title-lg text-title-lg text-on-surface truncate">
                        {b.student?.full_name ?? "User"}
                      </p>
                      <p className="text-body-sm text-on-surface-variant flex flex-wrap items-center gap-x-3">
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined !text-[14px]">home</span>
                          {b.rooms?.kos?.name ?? "Kos"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="material-symbols-outlined !text-[14px]">meeting_room</span>
                          Kamar {b.rooms?.room_number}
                        </span>
                        {b.student?.phone && (
                          <a
                            href={`https://wa.me/${b.student.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:underline"
                          >
                            <span className="material-symbols-outlined !text-[14px]">call</span>
                            {b.student.phone}
                          </a>
                        )}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm text-outline">Jumlah Refund</p>
                      <p className="font-headline-md text-headline-md text-error font-bold">
                        {formatPrice(b.total_amount)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm bg-surface-container-low p-3 rounded-lg">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-outline mb-0.5">
                        Booking Dibuat
                      </p>
                      <p className="font-semibold">{formatDate(b.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-outline mb-0.5">
                        Terakhir Diperbarui
                      </p>
                      <p className="font-semibold">{formatDate(b.updated_at)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-outline mb-0.5">
                        {tab === "pending" ? "Menunggu Sejak" : "Diproses"}
                      </p>
                      <p className="font-semibold">
                        {formatDate(tab === "pending" ? b.updated_at : b.refund_processed_at)}
                      </p>
                    </div>
                  </div>

                  {b.rejection_reason && (
                    <p className="mt-3 text-xs text-outline bg-surface-container-low rounded-lg px-3 py-2">
                      Alasan pembatalan: {b.rejection_reason}
                    </p>
                  )}
                </div>

                {tab === "pending" && (
                  <div className="px-5 md:px-6 py-4 border-t border-outline-variant bg-surface-container-low/50 flex justify-end">
                    <button
                      onClick={() => handleProcess(b.id)}
                      disabled={actionLoading === b.id}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary text-white rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined !text-[18px]">verified</span>
                      {actionLoading === b.id ? "Memproses..." : "Tandai Sudah Direfund"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
