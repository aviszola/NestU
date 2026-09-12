"use client";

import type { AnomalyItem } from "@/lib/supabase/transactions";

function severityCls(sev: string): string {
  return sev === "high"
    ? "bg-error/10 text-error"
    : sev === "medium"
    ? "bg-tertiary/10 text-tertiary"
    : "bg-surface-container-high text-outline";
}
function severityLabel(sev: string): string {
  return sev === "high" ? "Tinggi" : sev === "medium" ? "Sedang" : "Rendah";
}

interface AnomalyListProps {
  anomalies: AnomalyItem[];
  onFilter: (item: AnomalyItem) => void;
  onDismiss: (id: string) => void;
}

export default function AnomalyList({
  anomalies,
  onFilter,
  onDismiss,
}: AnomalyListProps) {
  if (anomalies.length === 0) {
    return (
      <div className="bg-surface-container-low rounded-xl card-shadow p-4 flex items-center gap-3">
        <span className="material-symbols-outlined text-secondary">verified</span>
        <div>
          <h3 className="font-title-md text-title-md text-on-surface">Anomali Terdeteksi</h3>
          <p className="text-sm text-outline">Belum ada anomali — sistem terdeteksi OK.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-container-low rounded-xl card-shadow p-4 mb-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-error">warning</span>
        <h3 className="font-title-md text-title-md text-on-surface">Anomali Terdeteksi</h3>
        <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-error text-white text-[11px] font-bold">
          {anomalies.length}
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {anomalies.map((a) => (
          <li key={a.id} className="flex flex-col gap-1.5 bg-surface-container rounded-lg p-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${severityCls(a.severity)}`}>
                  {severityLabel(a.severity)}
                </span>
                <span className="font-medium text-on-surface text-sm">{a.title}</span>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => onFilter(a)}
                  className="flex items-center gap-1 text-xs font-medium text-on-surface-variant hover:bg-surface-container-high rounded-lg px-2 py-1">
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  Lihat
                </button>
                <button type="button" onClick={() => onDismiss(a.id)}
                  className="flex items-center gap-1 text-xs font-medium text-on-surface-variant hover:bg-surface-container-high rounded-lg px-2 py-1">
                  <span className="material-symbols-outlined text-sm">task_alt</span>
                  Tandai Selesai
                </button>
              </div>
            </div>
            <p className="text-xs text-outline">{a.description}</p>
            <p className="font-mono text-[11px] text-outline truncate">{a.orderId || a.bookingId || ""}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}