"use client";

import { approveKos, rejectKos } from "@/lib/supabase/actions";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import AdminShell from "@/components/layout/AdminShell";

function formatCompact(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "rb";
  return n.toLocaleString("id-ID");
}

export default function AdminKosVerificationPage() {
  const router = useRouter();
  const [kosList, setKosList] = useState<any[] | null>(null);
  const [stats, setStats] = useState({ pending: 0, verified: 0, users: 0 });
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [approveState, approveAction, approvePending] = useActionState(
    approveKos,
    undefined
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectKos,
    undefined
  );

  const actionPending = approvePending || rejectPending;
  const actionError = approveState?.error ?? rejectState?.error;
  const actionSuccess = approveState?.success || rejectState?.success;

  async function fetchData() {
    try {
      const sup = (await import("@/lib/supabase/client")).createClient();
      const { data: { user } } = await sup.auth.getUser();
      if (!user) { router.replace(`/login?redirect=${window.location.pathname}`); return; }

      const { data: profile } = await sup
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role !== "admin") { router.replace("/dashboard"); return; }

      const [kosResult, verifiedResult, usersResult] = await Promise.all([
        sup.from("kos").select("*, owner:owner_id(full_name)").eq("verification_status", "pending").order("created_at", { ascending: false }),
        sup.from("kos").select("id", { count: "exact", head: true }).eq("verification_status", "verified"),
        sup.from("profiles").select("id", { count: "exact", head: true }),
      ]);

      if (kosResult.error) setGlobalError(kosResult.error.message);
      else setKosList(kosResult.data);

      setStats({
        pending: kosResult.data?.length ?? 0,
        verified: verifiedResult.count ?? 0,
        users: usersResult.count ?? 0,
      });
    } catch (e: any) {
      setGlobalError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, [router]);

  useEffect(() => {
    if (actionSuccess) {
      setLoading(true);
      setGlobalError(null);
      fetchData();
    }
  }, [actionSuccess]);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-outline">Memuat...</p>
    </div>
  );

  const initials = (name: string) =>
    name?.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase() ?? "??";

  return (
    <AdminShell activePage="verification">
      <div className="p-margin-mobile md:p-margin-desktop">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 mb-stack-lg text-body-sm text-outline">
          <Link href="/admin" className="hover:text-primary cursor-pointer">Admin</Link>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-primary font-semibold">Verification Queue</span>
        </div>

        {/* Header */}
        <div className="mb-stack-lg">
          <h1 className="font-headline-lg text-headline-lg text-primary mb-2">Admin Verification Dashboard</h1>
          <p className="text-body-md text-on-surface-variant">Manage and review property submissions for student housing.</p>
        </div>

        {globalError && (
          <div className="mb-4 rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error">
            {globalError}
          </div>
        )}
        {actionError && (
          <div className="mb-4 rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error">
            {actionError}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-stack-lg">
          <div className="glass-card p-stack-lg rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between group hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-label-md text-label-md text-outline uppercase tracking-wider mb-1">Total Kos Pending</p>
                <h2 className="font-headline-lg text-headline-lg text-primary">{stats.pending}</h2>
              </div>
              <div className="w-12 h-12 rounded-full bg-on-tertiary-container/10 flex items-center justify-center text-on-tertiary-container">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
              </div>
            </div>
          </div>
          <div className="glass-card p-stack-lg rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between group hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-label-md text-label-md text-outline uppercase tracking-wider mb-1">Kos Terverifikasi</p>
                <h2 className="font-headline-lg text-headline-lg text-secondary">{formatCompact(stats.verified)}</h2>
              </div>
              <div className="w-12 h-12 rounded-full bg-on-secondary-container/10 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              </div>
            </div>
          </div>
          <div className="glass-card p-stack-lg rounded-xl shadow-sm border border-outline-variant/30 flex flex-col justify-between group hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-label-md text-label-md text-outline uppercase tracking-wider mb-1">Total User</p>
                <h2 className="font-headline-lg text-headline-lg text-on-background">{formatCompact(stats.users)}</h2>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary-container/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Queue */}
        <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden">
          <div className="p-stack-md md:p-stack-lg border-b border-outline-variant/30 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">rule</span>
              <h2 className="font-headline-md text-headline-md text-on-background">Antrean Verifikasi Kos</h2>
            </div>
          </div>

          {!kosList || kosList.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl text-outline block mb-2">verified</span>
              Tidak ada kos yang menunggu verifikasi.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant/30">
                      <th className="px-6 py-4 font-label-md text-label-md text-outline uppercase tracking-wider">Properti</th>
                      <th className="px-6 py-4 font-label-md text-label-md text-outline uppercase tracking-wider">Detail Pemilik</th>
                      <th className="px-6 py-4 font-label-md text-label-md text-outline uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 font-label-md text-label-md text-outline uppercase tracking-wider text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {kosList.map((kos) => (
                      <tr key={kos.id} className="hover:bg-surface-container-low/30 transition-colors">
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-xl overflow-hidden shadow-sm flex-shrink-0 bg-surface-variant">
                              {kos.foto?.[0] ? (
                                <img className="w-full h-full object-cover" src={kos.foto[0]} alt={kos.name} />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="material-symbols-outlined text-outline">store</span>
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-title-lg text-title-lg text-primary">{kos.name}</p>
                              <div className="flex items-center text-body-sm text-outline mt-1">
                                <span className="material-symbols-outlined text-[16px] mr-1">location_on</span>
                                {kos.address ?? "-"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold uppercase">
                              {initials(kos.owner?.full_name)}
                            </div>
                            <div>
                              <p className="font-body-md text-body-md text-on-surface font-semibold">{kos.owner?.full_name ?? "—"}</p>
                              <p className="text-body-sm text-outline">Pemilik Kos</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <span className="px-3 py-1 rounded-full bg-on-tertiary-container/10 text-on-tertiary-container text-label-md font-label-md">
                            Menunggu
                          </span>
                        </td>
                        <td className="px-6 py-6 text-right">
                          <div className="flex justify-end gap-2">
                            <form action={approveAction}>
                              <input type="hidden" name="kosId" value={kos.id} />
                              <button type="submit" disabled={actionPending}
                                className="px-3 py-1 bg-secondary text-on-primary rounded-lg text-label-md font-label-md hover:bg-secondary/90 transition-colors shadow-sm disabled:opacity-50">
                                {approvePending && actionPending ? "..." : "Setujui"}
                              </button>
                            </form>
                            <form action={rejectAction}>
                              <input type="hidden" name="kosId" value={kos.id} />
                              <button type="submit" disabled={actionPending}
                                className="px-3 py-1 bg-error text-on-error rounded-lg text-label-md font-label-md hover:bg-error/90 transition-colors shadow-sm disabled:opacity-50">
                                {rejectPending && actionPending ? "..." : "Tolak"}
                              </button>
                            </form>
                            <Link href={`/admin/kos/${kos.id}`} className="p-1 text-primary hover:bg-primary-container/10 rounded transition-colors" title="Detail Verifikasi">
                              <span className="material-symbols-outlined">visibility</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-6 bg-surface-container-low border-t border-outline-variant/30 flex justify-between items-center">
                <p className="text-body-sm text-outline">
                  Menampilkan 1 sampai {kosList.length} dari {stats.pending} verifikasi tertunda
                </p>
              </div>
            </>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
