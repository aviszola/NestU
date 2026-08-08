"use client";

import AdminShell from "@/components/layout/AdminShell";
import Link from "next/link";

interface Stats {
  pendingKos: number;
  verifiedKos: number;
  rejectedKos: number;
  pendingBookings: number;
  approvedBookings: number;
  rejectedBookings: number;
  cancelledBookings: number;
  siswaCount: number;
  pemilikCount: number;
  adminCount: number;
  totalUsers: number;
  weeks: { label: string; total: number; approved: number }[];
  allBookings: any[];
  totalKos: number;
}

export default function AdminDashboardContent({
  pendingKos,
  verifiedKos,
  rejectedKos,
  pendingBookings,
  approvedBookings,
  siswaCount,
  pemilikCount,
  adminCount,
  totalUsers,
  weeks,
  allBookings,
  totalKos,
}: Stats) {
  const maxTotal = Math.max(...weeks.map((w) => w.total), 1);
  const totalForDonut = totalUsers || 1;
  const siswaPct = (siswaCount / totalForDonut) * 100;
  const pemilikPct = (pemilikCount / totalForDonut) * 100;

  return (
    <AdminShell activePage="dashboard">
      <div className="p-margin-mobile md:p-margin-desktop">
        {/* Hero Banner */}
        <section className="mb-stack-lg">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
            <div className="relative z-10 p-6 md:p-8">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                NestU
              </h2>
              <p className="mt-2 text-blue-200 max-w-xl">
                Kelola dan pantau seluruh aktivitas kos, booking, dan pengguna dalam satu dashboard terpusat.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <div className="flex items-center gap-1.5 text-sm text-blue-200">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                  {totalUsers} pengguna terdaftar
                </div>
                <div className="flex items-center gap-1.5 text-sm text-blue-200">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                  {pendingKos} properti menunggu verifikasi
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stat Cards */}
        <section className="mb-stack-lg">
          <h2 className="sr-only">Ringkasan Statistik</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-outline-variant/50 bg-surface p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-on-surface-variant">Kos Terverifikasi</span>
                <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-emerald-600 text-lg">verified</span>
                </div>
              </div>
              <p className="text-3xl font-bold text-on-surface">{verifiedKos}</p>
              <p className="mt-1 text-xs text-outline">Properti aktif</p>
            </div>

            <Link href="/admin/kos" className="rounded-xl border border-outline-variant/50 bg-surface p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 block">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-on-surface-variant">Menunggu Verifikasi</span>
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-600 text-lg">pending</span>
                </div>
              </div>
              <p className="text-3xl font-bold text-amber-600">{pendingKos}</p>
              <p className="mt-1 text-xs text-outline">Butuh persetujuan</p>
            </Link>

            <div className="rounded-xl border border-outline-variant/50 bg-surface p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-on-surface-variant">Ditolak</span>
                <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-600 text-lg">block</span>
                </div>
              </div>
              <p className="text-3xl font-bold text-red-600">{rejectedKos}</p>
              <p className="mt-1 text-xs text-outline">Tidak memenuhi syarat</p>
            </div>

            <div className="rounded-xl border border-outline-variant/50 bg-surface p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-on-surface-variant">Total Pengguna</span>
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-600 text-lg">group</span>
                </div>
              </div>
              <p className="text-3xl font-bold text-on-surface">{totalUsers}</p>
              <p className="mt-1 text-xs text-outline">Siswa & Pemilik</p>
            </div>
          </div>
        </section>

        {/* Chart Row */}
        <section className="mb-stack-lg">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Booking Bar Chart */}
            <div className="lg:col-span-2 rounded-xl border border-outline-variant/50 bg-surface p-5">
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-on-surface">Statistik Booking Mingguan</h3>
                <p className="text-xs text-outline mt-0.5">Total booking per minggu (5 minggu terakhir)</p>
              </div>
              <div className="flex items-end gap-3 h-32">
                {weeks.map((w) => (
                  <div key={w.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-outline">{w.total}</span>
                    <div className="w-full flex flex-col items-center gap-0.5">
                      <div
                        className="w-full bg-primary rounded-t"
                        style={{ height: `${Math.max((w.total / maxTotal) * 100, 2)}px` }}
                      />
                      <div
                        className="w-full bg-secondary rounded-t"
                        style={{
                          height: `${Math.max((w.approved / maxTotal) * 100, w.approved > 0 ? 2 : 0)}px`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-outline">{w.label}</span>
                  </div>
                ))}
              </div>
              {allBookings && allBookings.length > 0 && (
                <p className="text-[10px] text-outline mt-3 text-center">
                  Total booking: {allBookings.length} (approved: {approvedBookings})
                </p>
              )}
            </div>

            {/* User Distribution */}
            <div className="rounded-xl border border-outline-variant/50 bg-surface p-5">
              <h3 className="text-sm font-semibold text-on-surface mb-4">Distribusi Pengguna</h3>
              <div className="flex justify-center mb-5">
                <div
                  className="relative w-32 h-32 rounded-full"
                  style={{
                    background: `conic-gradient(
                      #3b82f6 0deg ${siswaPct * 3.6}deg,
                      #10b981 ${siswaPct * 3.6}deg ${(siswaPct + pemilikPct) * 3.6}deg,
                      #8b5cf6 ${(siswaPct + pemilikPct) * 3.6}deg 360deg
                    )`,
                  }}
                >
                  <div className="absolute inset-2 rounded-full bg-surface flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-xl font-bold text-on-surface">{totalUsers}</p>
                      <p className="text-[10px] text-outline -mt-0.5">Total</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Siswa", value: siswaCount, color: "bg-blue-500", textColor: "text-blue-600" },
                  { label: "Pemilik Kos", value: pemilikCount, color: "bg-emerald-500", textColor: "text-emerald-600" },
                  { label: "Admin", value: adminCount, color: "bg-purple-500", textColor: "text-purple-600" },
                ].map((role) => (
                  <div key={role.label} className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-container-low">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${role.color}`} />
                      <span className="text-sm text-on-surface-variant">{role.label}</span>
                    </div>
                    <span className={`text-sm font-semibold ${role.textColor}`}>{role.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
