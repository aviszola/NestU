"use client";

import { formatRupiah } from "@/lib/supabase/analytics";
import type { TransactionRow } from "@/lib/supabase/transactions";
import {
  paymentBadge,
  bookingBadge,
  refundBadge,
  methodBadge,
} from "./statusMeta";

function nameOf(r: TransactionRow): string {
  return r.student?.full_name || r.student?.email || "—";
}
function kosName(r: TransactionRow): string {
  return r.kos?.name || "—";
}
function ownerName(r: TransactionRow): string {
  return r.owner?.full_name || "—";
}
function BadgeSpan({ cls, icon, label }: { cls: string; icon: string; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      <span className="material-symbols-outlined text-[13px]">{icon}</span>
      {label}
    </span>
  );
}

interface TransactionsTableProps {
  rows: TransactionRow[];
  currentPage: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  onDetail: (row: TransactionRow) => void;
  onRefund: (row: TransactionRow) => void;
  onOverride: (row: TransactionRow) => void;
  onExport: () => void;
}

export default function TransactionsTable({
  rows,
  currentPage,
  totalPages,
  total,
  onPageChange,
  onDetail,
  onRefund,
  onOverride,
  onExport,
}: TransactionsTableProps) {
  return (
    <div className="bg-surface-container-low rounded-xl card-shadow overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-outline-variant">
        <h2 className="font-title-md text-title-md text-on-surface">List Transaksi</h2>
        <div className="flex items-center gap-3">
          {total > 0 && <span className="text-xs text-outline">{total} transaksi</span>}
          <button
            type="button"
            onClick={onExport}
            disabled={rows.length === 0}
            className="flex items-center gap-1 text-sm font-medium bg-primary-container text-on-primary-container rounded-lg px-3 py-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">download</span>
            Export CSV
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="py-12 text-center">
          <span className="material-symbols-outlined text-5xl text-outline block mb-2">receipt_long</span>
          <p className="text-lg font-semibold text-on-surface">Belum ada transaksi</p>
          <p className="text-on-surface-variant font-body-md">
            Filter terpilih mungkin terlalu spesifik, atau belum ada transaksi masuk.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-container-high text-on-surface-variant">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium">Order ID</th>
                <th className="text-left px-3 py-2.5 font-medium">Tanggal</th>
                <th className="text-left px-3 py-2.5 font-medium">Siswa</th>
                <th className="text-left px-3 py-2.5 font-medium">Kos</th>
                <th className="text-left px-3 py-2.5 font-medium">Pemilik</th>
                <th className="text-left px-3 py-2.5 font-medium">Metode</th>
                <th className="text-right px-3 py-2.5 font-medium">Jumlah</th>
                <th className="text-left px-3 py-2.5 font-medium">Payment</th>
                <th className="text-left px-3 py-2.5 font-medium">Booking</th>
                <th className="text-left px-3 py-2.5 font-medium">Refund</th>
                <th className="text-right px-3 py-2.5 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
{rows.map((r) => {
                const pay = paymentBadge(r.paymentStatus);
                const bk = bookingBadge(r.bookingStatus);
                const ref = refundBadge(r.refundStatus);
                const mt = methodBadge(r.midtransOrderId ? "midtrans" : "manual");
                return (
                  <tr key={r.bookingId} className="hover:bg-surface-container">
                    <td className="px-3 py-2.5 font-mono text-xs max-w-40 truncate" title={r.orderId}>{r.orderId}</td>
                    <td className="px-3 py-2.5 text-on-surface-variant whitespace-nowrap">{r.dateLabel}</td>
                    <td className="px-3 py-2.5">
                      <a href={`/admin/users?u=${r.student?.id ?? ""}`} className="text-on-surface hover:underline">{nameOf(r)}</a>
                    </td>
                    <td className="px-3 py-2.5">
                      <a href={`/admin/kos?id=${r.kos?.id ?? ""}`} className="text-on-surface hover:underline">{kosName(r)}</a>
                    </td>
                    <td className="px-3 py-2.5">
                      <a href={`/admin/users?u=${r.owner?.id ?? ""}`} className="text-on-surface hover:underline">{ownerName(r)}</a>
                    </td>
                    <td className="px-3 py-2.5"><BadgeSpan cls={mt.className} icon={mt.icon} label={mt.label} /></td>
                    <td className="px-3 py-2.5 text-right font-medium text-on-surface">{formatRupiah(r.amount)}</td>
                    <td className="px-3 py-2.5"><BadgeSpan cls={pay.className} icon={pay.icon} label={pay.label} /></td>
                    <td className="px-3 py-2.5"><BadgeSpan cls={bk.className} icon={bk.icon} label={bk.label} /></td>
                    <td className="px-3 py-2.5"><BadgeSpan cls={ref.className} icon={ref.icon} label={ref.label} /></td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center gap-1">
                        <button type="button" title="Detail" onClick={() => onDetail(r)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high">
                          <span className="material-symbols-outlined text-base">visibility</span>
                        </button>
                        <button type="button" title="Refund" onClick={() => onRefund(r)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high">
                          <span className="material-symbols-outlined text-base">currency_exchange</span>
                        </button>
                        <button type="button" title="Override" onClick={() => onOverride(r)} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high">
                          <span className="material-symbols-outlined text-base">tune</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
{totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant text-sm">
          <span className="text-xs text-outline">Page {currentPage} / {totalPages}</span>
          <div className="flex items-center gap-1">
            <button type="button" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}
              className="px-3 py-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40">
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
            <button type="button" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)}
              className="px-3 py-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40">
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}