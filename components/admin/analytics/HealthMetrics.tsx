"use client";

import { formatCompact } from "@/lib/supabase/analytics";
import type { AnalyticsHealth } from "@/lib/supabase/analytics";

/** Row Health Metrics — payment success, refund rate, pending queues. */
export default function HealthMetrics({ health }: { health: AnalyticsHealth }) {
  const pct = (n: number) => `${formatCompact(n)}%`;
  const warnClasses =
    "bg-warning/10 text-warning border-2 border-warning";
  const infoClasses = "bg-surface-container-high text-on-surface-variant";

  const pendingWarn = health.pendingKos > 0 || health.pendingRefunds > 0;

  return (
    <div className="mt-6">
      <h2 className="font-title-lg text-title-lg text-on-surface mb-2">Health</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className={`rounded-xl card-shadow p-6 ${health.paymentSuccessRate < 70 ? warnClasses : infoClasses}`}>
          <div className="font-label-md text-label-md text-on-surface-variant">Payment Success Rate</div>
          <div className="text-3xl font-bold text-on-surface">{pct(health.paymentSuccessRate)}</div>
        </div>
        <div className={`rounded-xl card-shadow p-6 ${health.refundRate > 10 ? warnClasses : infoClasses}`}>
          <div className="font-label-md text-label-md text-on-surface-variant">Refund Rate</div>
          <div className="text-3xl font-bold text-on-surface">{pct(health.refundRate)}</div>
        </div>
        <div className={`rounded-xl card-shadow p-6 ${pendingWarn ? warnClasses : infoClasses}`}>
          <div className="font-label-md text-label-md text-on-surface-variant">Pending Queue</div>
          <div className="text-3xl font-bold text-on-surface">
            {health.pendingKos + health.pendingRefunds}
          </div>
          <div className="text-xs text-outline">
            {health.pendingKos} kos verifikasi · {health.pendingRefunds} refund
          </div>
        </div>
      </div>
    </div>
  );
}