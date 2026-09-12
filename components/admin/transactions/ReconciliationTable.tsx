"use client";

import { formatRupiah } from "@/lib/supabase/analytics";
import type {
  ReconciliationResult,
  ReconciliationRow,
} from "@/lib/supabase/transactions";

function resultCfg(r: ReconciliationRow): { cls: string; label: string; icon: string } {
  switch (r.result) {
    case "match":
      return { cls: "bg-secondary/10 text-secondary", label: "✅ Match", icon: "check_circle" };
    case "mismatch":
      return { cls: "bg-tertiary/10 text-tertiary", label: "⚠️ Status mismatch", icon: "sync_problem" };
    case "missing_in_db":
      return { cls: "bg-error/10 text-error", label: "🔴 Missing in DB", icon: "error" };
    case "missing_in_midtrans":
      return { cls: "bg-error/10 text-error", label: "Missing in Midtrans", icon: "link_off" };
  }
}

interface ReconciliationTableProps {
  result: ReconciliationResult;
  syncingIds: string[];
  onSync: (bookingId: string) => void;
}

export default function ReconciliationTable({
  result,
  syncingIds,
  onSync,
}: ReconciliationTableProps) {
  if (!result.configured) {
    return (
      <div className="bg-surface-container-low rounded-xl card-shadow p-6">
        <h2 className="font-title-md text-title-md text-on-surface">Rekonsiliasi Midtrans vs DB</h2>
        <div className="mt-3 bg-tertiary/10 text-tertiary rounded-lg p-3 text-sm">
          <span className="material-symbols-outlined text-base">info</span>
          {result.message ?? "[TODO: Setup MIDTRANS_SERVER_KEY]"}
          <p className="mt-1 text-xs text-on-surface">
            Set MIDTRANS_SERVER_KEY / NEXT_PUBLIC_MIDTRANS_CLIENT_KEY di environment untuk mengizinkan rekonsiliasi. Tombol jalan di-disabled.
          </p>
        </div>
      </div>
    );
  }

  const s = result.summary;
  const highlighted = (cls: string, label: string, v: number) => (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${cls}`}>
      <span className="text-2xl font-bold">{v}</span>
      <span className="text-xs text-on-surface-variant">{label}</span>
    </div>
  );

  return (
    <div className="bg-surface-container-low rounded-xl card-shadow overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
        <h2 className="font-title-md text-title-md text-on-surface">Rekonsiliasi Midtrans vs DB</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-4 py-3">
        {highlighted("bg-secondary/10 text-secondary", "Matched", s.matched)}
        {highlighted("bg-tertiary/10 text-tertiary", "Mismatch", s.mismatch)}
        {highlighted("bg-error/10 text-error", "Missing in DB", s.missingInDb)}
        {highlighted("bg-error/10 text-error", "Missing in Midtrans", s.missingInMidtrans)}
      </div>

      {result.rows.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-lg font-semibold text-on-surface">Belum ada transaksi midtrans di periode ini</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-container-high text-on-surface-variant">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Order ID</th>
                <th className="text-right px-3 py-2 font-medium">Amount DB</th>
                <th className="text-right px-3 py-2 font-medium">Amount Midtrans</th>
                <th className="text-left px-3 py-2 font-medium">Status DB</th>
                <th className="text-left px-3 py-2 font-medium">Status Midtrans</th>
                <th className="text-right px-3 py-2 font-medium">Delta</th>
                <th className="text-left px-3 py-2 font-medium">Result</th>
                <th className="text-right px-3 py-2 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {result.rows.map((r) => {
                const cfg = resultCfg(r);
                const rowCls =
                  r.result === "match" ? "bg-secondary/5"
                  : r.result === "mismatch" ? "bg-tertiary/5"
                  : "bg-error/5";
                const showSync = r.result === "mismatch" || r.result === "missing_in_db";
                return (
                  <tr key={r.bookingId} className={rowCls}>
                    <td className="px-3 py-2 font-mono text-xs max-w-40 truncate" title={r.orderId}>{r.orderId}</td>
                    <td className="px-3 py-2 text-right">{formatRupiah(r.amountDb)}</td>
                    <td className="px-3 py-2 text-right">{r.amountMid != null ? formatRupiah(r.amountMid) : "—"}</td>
                    <td className="px-3 py-2">{r.statusDb}</td>
                    <td className="px-3 py-2">{r.statusMid || "—"}</td>
                    <td className="px-3 py-2 text-right">{r.delta != null ? formatRupiah(r.delta) : "—"}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {showSync && (
                        <button type="button" disabled={syncingIds.includes(r.bookingId)}
                          onClick={() => onSync(r.bookingId)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                          {syncingIds.includes(r.bookingId) ? "Sync..." : "Sync"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}