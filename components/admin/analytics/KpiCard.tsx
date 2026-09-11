"use client";

/** Kartu KPI reusable — icon + label + value besar + delta + sub-line. */
export interface KpiCardProps {
  icon: string;
  label: string;
  value: string;
  /** Delta % vs periode vorige. null = geen data prev periode. */
  deltaPct?: number | null;
  deltaUp?: boolean;
  /** Voor metrik waar laag beter is (bv. refund rate). */
  deltaGoodDown?: boolean;
  sub?: string;
}

function compact(n: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n || 0);
}

export default function KpiCard({
  icon,
  label,
  value,
  deltaPct,
  deltaUp = true,
  deltaGoodDown = false,
  sub,
}: KpiCardProps) {
  const showDelta = typeof deltaPct === "number";
  const up = deltaUp;
  const good = deltaGoodDown ? !up : up;

  return (
    <div className="bg-surface-container-lowest rounded-xl card-shadow p-6 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-md">
        <span className="material-symbols-outlined text-primary text-lg">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="text-3xl font-bold text-on-surface">{value}</div>
      {showDelta ? (
        <div className={`flex items-center gap-1 text-sm font-medium ${good ? "text-secondary" : "text-error"}`}>
          <span className="material-symbols-outlined text-base">
            {up ? "trending_up" : "trending_down"}
          </span>
          <span>{deltaPct > 0 ? "+" : ""}{compact(deltaPct)}%</span>
          <span className="text-outline text-xs">vs periode sebelumnya</span>
        </div>
      ) : (
        <div className="text-sm text-outline">Geen delta (periode vorige zonder data)</div>
      )}
      {sub && <div className="text-xs text-outline">{sub}</div>}
    </div>
  );
}