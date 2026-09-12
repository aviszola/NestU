"use client";

import { useEffect, useState } from "react";
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

const TIMELINE = ["pending", "approved", "menunggu_konfirmasi", "lunas"];

interface TransactionDetailProps {
  open: boolean;
  bookingId: string | null;
  orderId: string;
  onClose: () => void;
  onChanged: () => void;
}

export default function TransactionDetail({
  open,
  bookingId,
  orderId,
  onClose,
  onChanged,
}: TransactionDetailProps) {
  const [detail, setDetail] = useState<TxDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionOpen, setActionOpen] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [overrideStatus, setOverrideStatus] = useState("lunas");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !bookingId) return;
    setLoading(true);
    setError(null);
    setDetail(null);
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
  }, [open, bookingId]);

const runAction = async (
    endpoint: string,
    payload: Record<string, unknown>
  ) => {
    if (!bookingId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, bookingId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal aksi.");
        setActionOpen(null);
        return;
      }
      setActionOpen(null);
      setReason("");
      onChanged();
      setLoading(true);
      const dRes = await fetch(`/api/admin/transactions/${bookingId}`);
      const dData = await dRes.json();
      setDetail(dData.detail ?? detail);
      setLoading(false);
    } catch (e: any) {
      setError(e?.message ?? "Gagal aksi.");
      setActionOpen(null);
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const row = detail?.row;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4" onClick={onClose}>
      <div className="bg-surface-container-lowest rounded-2xl w-full max-w-2xl shadow-lg max-h-[92vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-title-lg text-title-lg text-on-surface">Detail Transaksi</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <p className="font-mono text-xs text-outline break-all">{orderId}</p>

        {loading && (
          <div className="mt-6 space-y-3 animate-pulse">
            <div className="h-6 rounded bg-surface-container-high" />
            <div className="h-6 rounded bg-surface-container-high" />
            <div className="h-24 rounded bg-surface-container-high" />
          </div>
        )}
        {error && <div className="mt-6 text-error">{error}</div>}
{row && (
          <>
            <div className="mt-4">
              <h3 className="font-label-md text-label-md text-on-surface-variant">Timeline Status</h3>
              <div className="flex flex-wrap items-center gap-1 mt-2">
                <div className="flex items-center gap-3 flex-wrap">
                  {TIMELINE.map((step, i) => (
                    <span key={step} className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${row.paymentStatus === "lunas" || i <= 2 ? "bg-secondary text-on-secondary" : "bg-surface-container-high text-outline"}`}>
                        <span className="material-symbols-outlined text-xs">{i <= 2 || row.paymentStatus === "lunas" ? "check" : "radio_button_unchecked"}</span>
                      </span>
                      <span className={`text-[11px] ${row.paymentStatus === "lunas" || i <= 2 ? "text-on-surface" : "text-outline"}`}>{step.replace("_", " ")}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge {...paymentBadge(row.paymentStatus)} />
                <Badge {...bookingBadge(row.bookingStatus)} />
                <Badge {...refundBadge(row.refundStatus)} />
                <Badge {...methodBadge(row.midtransOrderId ? "midtrans" : "manual")} />
              </div>
            </div>

            <div className="mt-4 bg-surface-container rounded-xl p-3">
              <h3 className="font-label-md text-label-md text-on-surface-variant">Info Booking</h3>
              <Row label="Tanggal" value={row.dateLabel} />
              <Row label="Siswa" value={row.student?.full_name || row.student?.email || "—"} />
              <Row label="Kos" value={row.kos?.name || "—"} />
              <Row label="Kamar" value={row.roomNumber || "—"} />
              <Row label="Durasi" value={row.durationMonths ? `${row.durationMonths} bulan` : "—"} />
              <Row label="Harga /bulan" value={formatRupiah(row.baseMonthlyPrice ?? 0)} />
              <Row label="Total" value={formatRupiah(row.amount)} />
              <Row label="Pemilik" value={row.owner?.full_name || "—"} />
              {detail.moveInDate && <Row label="Check-in" value={formatDateIndo(detail.moveInDate)} />}
              {detail.notes && <Row label="Nota" value={detail.notes} />}
              {detail.rejectionReason && <Row label="Alasan Tolak" value={detail.rejectionReason} />}
            </div>

            <div className="mt-4 bg-surface-container rounded-xl p-3">
              <h3 className="font-label-md text-label-md text-on-surface-variant">Data Midtrans</h3>
              <Row label="Order ID" value={row.midtransOrderId || "—"} />
              <Row label="Transaction ID" value={row.midtransTransactionId || "—"} />
              <Row label="Status Midtrans" value={row.midtransStatus || "—"} />
              <Row label="Paid At" value={formatDateIndo(row.paidAt)} />
              <Row label="Expire" value={formatDateIndo(detail.paymentExpiredAt)} />
              {row.paymentNote && <Row label="Nota Pembayaran" value={row.paymentNote} />}
              {row.paymentProofPath && (
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-on-surface-variant">Bukti Transfer</span>
                  <a href={`/api/storage/bukti/${row.bookingId}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">
                    Lihat Bukti
                  </a>
                </div>
              )}
            </div>

            <div className="mt-4 bg-surface-container rounded-xl p-3">
              <h3 className="font-label-md text-label-md text-on-surface-variant">Riwayat Admin ({detail.logs.length})</h3>
              {detail.logs.length === 0 ? (
                <p className="text-sm text-outline mt-1">Belum ada override/aksi admin.</p>
              ) : (
                <ul className="mt-1 space-y-1.5 text-sm">
                  {detail.logs.map((l) => (
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
{row && (
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => { setReason(""); setError(null); setActionOpen("override"); }}
              className="flex items-center gap-1 text-sm font-medium bg-primary-container text-on-primary-container rounded-lg px-3 py-2">
              <span className="material-symbols-outlined text-base">tune</span>
              Override Payment Status
            </button>
            <button type="button" onClick={() => { setReason(""); setError(null); setActionOpen("refund"); }}
              className="flex items-center gap-1 text-sm font-medium bg-tertiary text-on-tertiary rounded-lg px-3 py-2">
              <span className="material-symbols-outlined text-base">currency_exchange</span>
              Refund
            </button>
            <button type="button" onClick={() => { setReason(""); setError(null); setActionOpen("force-cancel"); }}
              className="flex items-center gap-1 text-sm font-medium bg-error-container text-on-error-container rounded-lg px-3 py-2">
              <span className="material-symbols-outlined text-base">block</span>
              Force Cancel
            </button>
          </div>
        )}

        {actionOpen && (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={() => setActionOpen(null)}>
            <div className="bg-surface-container-lowest rounded-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-title-md text-title-md text-on-surface">
                {actionOpen === "override" ? "Override Payment" : actionOpen === "refund" ? "Request Refund" : "Force Cancel"}
              </h3>
              <p className="text-sm text-on-surface-variant mt-1">
                {actionOpen === "override"
                  ? "Set payment status (belum_bayar / menunggu_konfirmasi / lunas / expired)."
                  : actionOpen === "refund"
                  ? "Set refund status pending (request) atau processed (process) — tandai via flow admin."
                  : "Force cancel booking (via RPC audit admin_override_booking_status)."}
              </p>
              {actionOpen === "override" && (
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  className="w-full mt-2 mb-1 bg-surface-container-high border border-outline-variant rounded-lg px-3 py-2 text-sm"
                >
                  <option value="lunas">Lunas</option>
                  <option value="menunggu_konfirmasi">Menunggu Konfirmasi</option>
                  <option value="belum_bayar">Belum Bayar</option>
                  <option value="expired">Kadaluarsa</option>
                </select>
              )}
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Alasan (minimal 20 karakter)..."
                rows={3}
                className="w-full mt-2 bg-surface-container-high border border-outline-variant rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex justify-end gap-2 mt-3">
                <button type="button" onClick={() => setActionOpen(null)} className="px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container">
                  Batal
                </button>
                <button type="button" disabled={busy || reason.trim().length < 20}
                  onClick={() => {
                    const trimmed = reason.trim();
                    if (actionOpen === "override") {
                      void runAction("/api/admin/transactions/override-payment", { newStatus: overrideStatus, reason: trimmed });
                    } else if (actionOpen === "refund") {
                      void runAction("/api/admin/transactions/refund", { action: "request", reason: trimmed });
                    } else {
                      void runAction("/api/admin/transactions/force-cancel", { reason: trimmed });
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-primary text-on-primary font-medium disabled:opacity-50">
                  {busy ? "Proses..." : "Konfirmasi"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}