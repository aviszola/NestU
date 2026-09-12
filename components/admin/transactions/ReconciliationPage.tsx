"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AdminShell from "@/components/layout/AdminShell";
import ReconciliationTable from "./ReconciliationTable";
import type { ReconciliationResult } from "@/lib/supabase/transactions";

function isoDaysAgo(days: number): string {
  const d = new Date(Date.now() - days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

interface ReconciliationPageProps {
  result: ReconciliationResult;
  from?: string | null;
  to?: string | null;
}

export default function ReconciliationPage({
  result,
  from,
  to,
}: ReconciliationPageProps) {
  const router = useRouter();
  const [customFrom, setCustomFrom] = useState(from ?? isoDaysAgo(30));
  const [customTo, setCustomTo] = useState(to ?? new Date().toISOString().slice(0, 10));
  const [syncingIds, setSyncingIds] = useState<string[]>([]);

  const goRange = (f: string, t: string) => {
    router.push(`/admin/transactions/reconciliation?from=${f}&to=${t}`);
  };

  const syncRow = async (bookingId: string) => {
    setSyncingIds([...syncingIds, bookingId]);
    try {
      const res = await fetch("/api/admin/transactions/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Gagal sync.");
      } else {
        alert(data.message ?? "Sync selesai.");
        router.refresh();
      }
    } catch {
      alert("Gagal sync.");
    } finally {
      setSyncingIds(syncingIds.filter((id) => id !== bookingId));
    }
  };

  return (
    <AdminShell activePage="transactions">
      <div className="p-margin-mobile md:p-margin-desktop">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary">Rekonsiliasi</h1>
          <p className="text-on-surface-variant font-body-md">
            Bandingkan transaksi Midtrans dengan data DB, dan fix mismatch via Sync.
          </p>
        </div>

        <div className="bg-surface-container-low rounded-xl card-shadow p-4 mt-4 flex flex-col md:flex-row md:items-center gap-3">
          <h2 className="font-title-md text-title-md text-on-surface">Jalankan Rekonsiliasi</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => goRange(isoDaysAgo(7), new Date().toISOString().slice(0, 10))}
              className="px-3 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-high">
              7d
            </button>
            <button type="button" onClick={() => goRange(isoDaysAgo(30), new Date().toISOString().slice(0, 10))}
              className="px-3 py-2 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-high">
              30d
            </button>
            <span className="text-on-surface-variant text-xs mx-1">Custom</span>
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
              className="bg-surface-container-high border border-outline-variant rounded-lg px-2 py-1.5 text-sm" />
            <span className="text-on-surface-variant">–</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
              className="bg-surface-container-high border border-outline-variant rounded-lg px-2 py-1.5 text-sm" />
            <button type="button" disabled={!customFrom || !customTo} onClick={() => goRange(customFrom, customTo)}
              className="flex items-center gap-1 text-sm font-medium bg-primary text-on-primary rounded-lg px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md active:scale-[0.98] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              <span className="material-symbols-outlined text-base">play_arrow</span>
              Jalankan
            </button>
          </div>
        </div>

        <div className="mt-4">
          <ReconciliationTable result={result} syncingIds={syncingIds} onSync={syncRow} />
        </div>
      </div>
    </AdminShell>
  );
}