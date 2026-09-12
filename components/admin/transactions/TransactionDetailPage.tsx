"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/layout/AdminShell";
import { formatRupiah } from "@/lib/supabase/analytics";
import type { TransactionDetail as TxDetail } from "@/lib/supabase/transactions";
import { formatDateIndo } from "@/lib/supabase/transactions";
import {
  paymentBadge,
  bookingBadge,
  refundBadge,
  methodBadge,
} from "./statusMeta";

function Badge({ className, icon, label }: { className: string; icon: string; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>
      <span className="material-symbols-outlined text-[13px]">{icon}</span>
      {label}
    </span>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-xs text-on-surface-variant">{label}</span>
      <span className="text-sm font-medium text-on-surface text-right">{value || "—"}</span>
    </div>
  );
}

export default function TransactionDetailPage({ bookingId }: { bookingId: string }) {
  const [detail, setDetail] = useState<TxDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/transactions/${bookingId}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.detail) setDetail(d.detail);
        else setError(d.error ?? "Gagal ambil detail.");
      })
      .catch(() => {
        if (!cancelled) setError("Gagal ambil detail.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const row = detail?.row;

  return (
    <AdminShell activePage="transactions">
      <div className="p-margin-mobile md:p-margin-desktop">
        <div className="flex items-center gap-3">
          <Link href="/admin/transactions" className="material-symbols-outlined p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high">arrow_back</Link>
          <div>
            <h1 className="font-headline-lg text-headline-lg text-primary">Detail Transaksi</h1>
            {row && <p className="font-mono text-xs text-outline break-all">{row.orderId}</p>}
          </div>
        </div>

        {loading && (
          <div className="mt-6 space-y-3 animate-pulse">
            <div className="h-6 rounded bg-surface-container-high" />
            <div className="h-24 rounded bg-surface-container-high" />
            <div className="h-24 rounded bg-surface-container-high" />
          </div>
        )}
        {error && <div className="mt-6 text-error">{error}</div>}

        {row && (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge {...paymentBadge(row.paymentStatus)} />
              <Badge {...bookingBadge(row.bookingStatus)} />
              <Badge {...refundBadge(row.refundStatus)} />
              <Badge {...methodBadge(row.midtransOrderId ? "midtrans" : "manual")} />
            </div>
<div className="mt-4 bg-surface-container rounded-xl p-3">
              <h2 className="font-label-md text-label-md text-on-surface-variant">Info Booking</h2>
              <Row label="Tanggal" value={row.dateLabel} />
              <Row label="Siswa" value={row.student?.full_name || row.student?.email || "—"} />
              <Row label="Kos" value={row.kos?.name || "—"} />
              <Row label="Kamar" value={row.roomNumber || "—"} />
              <Row label="Durasi" value={row.durationMonths ? `${row.durationMonths} bulan` : "—"} />
              <Row label="Harga /bulan" value={formatRupiah(row.baseMonthlyPrice ?? 0)} />
              <Row label="Total" value={formatRupiah(row.amount)} />
              <Row label="Pemilik" value={row.owner?.full_name || "—"} />
              {detail?.moveInDate && <Row label="Check-in" value={formatDateIndo(detail.moveInDate)} />}
              {detail?.notes && <Row label="Nota" value={detail.notes} />}
              {detail?.rejectionReason && <Row label="Alasan Tolak" value={detail.rejectionReason} />}
            </div>

            <div className="mt-4 bg-surface-container rounded-xl p-3">
              <h2 className="font-label-md text-label-md text-on-surface-variant">Data Midtrans</h2>
              <Row label="Order ID" value={row.midtransOrderId || "—"} />
              <Row label="Transaction ID" value={row.midtransTransactionId || "—"} />
              <Row label="Status Midtrans" value={row.midtransStatus || "—"} />
              <Row label="Paid At" value={formatDateIndo(row.paidAt)} />
              <Row label="Expire" value={formatDateIndo(detail?.paymentExpiredAt)} />
              {row.paymentNote && <Row label="Nota Pembayaran" value={row.paymentNote} />}
              {row.paymentProofPath && (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-on-surface-variant">Bukti Transfer</span>
                  <a href={`/api/storage/bukti/${row.bookingId}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">Lihat Bukti</a>
                </div>
              )}
            </div>

            <div className="mt-4 bg-surface-container rounded-xl p-3">
              <h2 className="font-label-md text-label-md text-on-surface-variant">Riwayat Admin ({detail?.logs.length ?? 0})</h2>
              {!detail?.logs?.length ? (
                <p className="text-sm text-outline mt-1">Belum ada override/aki admin.</p>
              ) : (
                <ul className="mt-1 space-y-1.5 text-sm">
                  {detail!.logs.map((l) => (
                    <li key={l.id} className="flex flex-col gap-0.5">
                      <span className="text-xs text-on-surface-variant">
                        {l.adminName || "Admin"} · {l.actionType.replace("_", " ")} · {formatDateIndo(l.createdAt)}
                      </span>
                      <span className="text-[13px] text-on-surface">
                        {l.oldValue || "—"} → {l.newValue || "—"} <span className="text-outline">· {l.reason || ""}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}