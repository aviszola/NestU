"use client";

import { useEffect, useState } from "react";
import { getAdminActionLogs } from "@/lib/supabase/queries";
import AdminShell from "@/components/layout/AdminShell";

interface LogRow {
  id: string;
  admin_id: string;
  booking_id: string;
  action_type: string;
  old_value: string | null;
  new_value: string | null;
  reason: string;
  created_at: string;
  admin?: { full_name?: string } | null;
}

function fmt(dateStr: string): string {
  return new Date(dateStr).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminOverridesContent() {
  const [logs, setLogs] = useState<LogRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const data = await getAdminActionLogs(supabase, 100);
        setLogs(data);
      } catch (e: any) {
        setError(e.message ?? "Gagal memuat riwayat");
      }
    })();
  }, []);

  return (
    <AdminShell activePage="bookings">
      <main className="p-margin-mobile md:p-margin-desktop pb-32">
        <div className="mb-stack-lg">
          <h2 className="font-headline-lg text-headline-lg text-primary">
            Riwayat Override Admin
          </h2>
          <p className="text-body-md text-on-surface-variant">
            Semua perubahan status booking yang dilakukan admin di luar alur
            pemilik (override darurat) tercatat di sini untuk transparansi
            antar admin.
          </p>
        </div>

        {error && (
          <div className="mb-stack-md px-4 py-3 text-sm text-error bg-error-container/20 rounded-lg">
            {error}
          </div>
        )}

        {!logs ? (
          <p className="text-body-md text-on-surface-variant">Memuat...</p>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-xl border border-outline-variant/30 p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-outline block mb-2">
              verified_user
            </span>
            <p className="text-on-surface-variant font-body-md text-body-md">
              Belum ada override admin tercatat.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(30,58,138,0.05)] border border-outline-variant/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">Waktu</th>
                    <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">Admin</th>
                    <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">Booking</th>
                    <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">Perubahan</th>
                    <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">Alasan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {logs.map((l) => (
                    <tr key={l.id} className="hover:bg-surface-container-low transition-colors align-top">
                      <td className="px-6 py-4 text-body-sm text-on-surface-variant whitespace-nowrap">
                        {fmt(l.created_at)}
                      </td>
                      <td className="px-6 py-4 text-body-sm text-on-surface">
                        {l.admin?.full_name ?? l.admin_id.slice(0, 8)}
                      </td>
                      <td className="px-6 py-4 text-body-sm text-on-surface-variant">
                        <span className="font-mono text-xs">
                          {l.booking_id.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="px-6 py-4 text-body-sm">
                        <span className="inline-flex items-center gap-1 text-error">
                          <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                          {l.old_value ?? "-"}
                        </span>
                        <span className="mx-2 text-outline">→</span>
                        <span className="inline-flex items-center gap-1 text-secondary">
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          {l.new_value ?? "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-body-sm text-on-surface-variant max-w-sm">
                        {l.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </AdminShell>
  );
}
