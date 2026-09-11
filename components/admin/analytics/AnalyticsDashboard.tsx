"use client";

import AdminShell from "@/components/layout/AdminShell";
import PeriodFilter from "./PeriodFilter";
import KpiCard from "./KpiCard";
import BookingTrendChart from "./BookingTrendChart";
import RevenueChart from "./RevenueChart";
import TopKosTable from "./TopKosTable";
import TopOwnersTable from "./TopOwnersTable";
import RecentActivity from "./RecentActivity";
import HealthMetrics from "./HealthMetrics";
import { formatRupiah, formatCompact } from "@/lib/supabase/analytics";
import type { AnalyticsResult } from "@/lib/supabase/analytics";

function EmptyState() {
  return (
    <div className="mt-10 text-center py-16">
      <span className="material-symbols-outlined text-6xl text-outline block mb-2">
        monitoring
      </span>
      <p className="text-lg font-semibold text-on-surface">Belum ada data di periode ini</p>
      <p className="text-on-surface-variant font-body-md">
        Kies ander periode (7d/30d/90d/custom) of wacht tot er data binnenkomt.
      </p>
    </div>
  );
}

/** Rakit Analytics Dashboard — data kompt dari server component (reactive op filter). */
export default function AnalyticsDashboard({
  analytics,
  period,
}: {
  analytics: AnalyticsResult;
  period: string;
}) {
  const k = analytics.kpi;
  const hasData = k.totalBookings > 0 || k.gmv > 0;

  return (
    <AdminShell activePage="analytics">
      <div className="p-margin-mobile md:p-margin-desktop">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-primary">Analytics</h1>
            <p className="text-on-surface-variant font-body-md">
              Metrik bisnis real-time dari database.
            </p>
          </div>
          <PeriodFilter current={period} />
        </div>

        {!hasData ? (
          <EmptyState />
        ) : (
          <>
            {/* Row 1 — KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mt-6">
              <KpiCard
                icon="payments"
                label="GMV"
                value={formatRupiah(k.gmv)}
                deltaPct={k.gmvDeltaPct}
                deltaUp={k.gmvTrendUp}
                sub="Total pembayaran lunas"
              />
              <KpiCard
                icon="receipt_long"
                label="Total Booking"
                value={String(k.totalBookings)}
                sub={`${k.pending} pending · ${k.approved} approved · ${k.completed} completed`}
              />
              <KpiCard
                icon="conversion"
                label="Conversion Rate"
                value={`${formatCompact(k.conversionRate)}%`}
                sub={`Target benchmark ${formatCompact(k.conversionTarget)}%`}
              />
              <KpiCard
                icon="group"
                label="Active Users"
                value={String(k.activeUsers)}
                sub={`${k.activeSiswa} siswa · ${k.activePemilik} pemilik`}
              />
            </div>

            {/* Row 2 — Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="bg-surface-container-lowest rounded-xl card-shadow p-6">
                <h2 className="font-title-lg text-title-lg text-on-surface">Booking Trend</h2>
                <p className="text-xs text-outline">Booking nieuwe + completed per dag</p>
                <div className="mt-2">
                  {analytics.trend.length
                    ? <BookingTrendChart data={analytics.trend} />
                    : <p className="text-outline">Belum ada data</p>}
                </div>
              </div>
              <div className="bg-surface-container-lowest rounded-xl card-shadow p-6">
                <h2 className="font-title-lg text-title-lg text-on-surface">Revenue per Bulan</h2>
                <p className="text-xs text-outline">GMV 6 bulan terakhir</p>
                <div className="mt-2">
                  {analytics.revenue.length
                    ? <RevenueChart data={analytics.revenue} />
                    : <p className="text-outline">Belum ada data</p>}
                </div>
              </div>
            </div>

            {/* Row 3 — Top lists */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <TopKosTable rows={analytics.topKos} />
              <TopOwnersTable rows={analytics.topOwners} />
              <RecentActivity rows={analytics.activity} />
            </div>

            {/* Row 4 — Health */}
            <HealthMetrics health={analytics.health} />
          </>
        )}
      </div>
    </AdminShell>
  );
}