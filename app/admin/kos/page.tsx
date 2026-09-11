"use client";

import { approveKos, rejectKos } from "@/lib/supabase/actions";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import Image from "next/image";
import AdminShell from "@/components/layout/AdminShell";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

function formatCompact(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "rb";
  return n.toLocaleString("id-ID");
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

const initials = (name: string | null | undefined) =>
  name?.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase() ?? "??";

const FILTERS: { key: string; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "menunggu", label: "Menunggu" },
  { key: "terverifikasi", label: "Terverifikasi" },
  { key: "ditolak", label: "Ditolak" },
];

// Map tab key → kos.verification_status (null = semua)
const STATUS_BY_FILTER: Record<string, string | null> = {
  semua: null,
  menunggu: "pending",
  terverifikasi: "verified",
  ditolak: "rejected",
};
export default function AdminKosVerificationPage() {
  const router = useRouter();
  const [allKos, setAllKos] = useState<any[] | null>(null);
  const [filter, setFilter] = useState("menunggu");
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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

      const { data, error } = await sup
        .from("kos")
        .select("*, owner:owner_id(full_name)")
        .order("created_at", { ascending: false });

      if (error) setGlobalError(error.message);
      else setAllKos(data ?? []);
    } catch (e: any) {
      setGlobalError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, [router]);

  useEffect(() => {
    if (actionSuccess) {
      setRejectTarget(null);
      setRejectReason("");
      setLoading(true);
      setGlobalError(null);
      fetchData();
    }
  }, [actionSuccess]);

  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-outline">Memuat...</p>
      </div>
    );

  const list = allKos ?? [];
  const stats = {
    total: list.length,
    pending: list.filter((k) => k.verification_status === "pending").length,
    verified: list.filter((k) => k.verification_status === "verified").length,
    rejected: list.filter((k) => k.verification_status === "rejected").length,
  };
  const filterStatus = STATUS_BY_FILTER[filter];
  const filtered = filterStatus
    ? list.filter((k) => k.verification_status === filterStatus)
    : list;
  const filterLabel =
    FILTERS.find((f) => f.key === filter)?.label ?? "Semua";

  const statusBadge = (kos: any) => {
    if (kos.verification_status === "verified") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/90 text-white text-[10px] font-bold backdrop-blur-sm">
          <span className="material-symbols-outlined !text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
          Terverifikasi
        </span>
      );
    }
    if (kos.verification_status === "rejected") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-error/90 text-white text-[10px] font-bold backdrop-blur-sm">
          <span className="material-symbols-outlined !text-[12px]">block</span>
          Ditolak
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-tertiary/90 text-white text-[10px] font-bold backdrop-blur-sm">
        <span className="material-symbols-outlined !text-[12px]">pending</span>
        Menunggu
      </span>
    );
  };
return (
    <AdminShell activePage="verification">
      {/* ── Header hero — pola sama dgn dashboard owner ── */}
      <section className="px-margin-mobile md:px-margin-desktop pt-6 md:pt-10 pb-2">
        <div className="relative overflow-hidden rounded-2xl bg-on-surface card-shadow">
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{
            backgroundImage:
              "linear-gradient(rgba(11,28,48,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(11,28,48,0.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }} />
          <div className="relative flex flex-col gap-4 p-6 md:p-8">
            <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary-fixed backdrop-blur-sm">
              <span className="material-symbols-outlined !text-sm">verified_user</span>
              Verifikasi Admin
            </p>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white text-balance">
              Verifikasi Properti
            </h1>
            <p className="text-sm md:text-base text-white/70 max-w-md leading-relaxed">
              Pantau dan menyetujui/ditolak submission kos dari pemilik untuk mengekkup kualitas hunian.
            </p>
          </div>
        </div>
      </section>

      <div className="px-margin-mobile md:px-margin-desktop py-6">
        {/* ── Stat cards — hierarki radius/shadow beda per kartu ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-gutter">
          {/* Total Kos */}
          <div className="p-stack-md bg-white rounded-xl card-shadow border border-outline-variant flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <span className="font-label-md text-on-surface-variant uppercase tracking-wider">Total Kos</span>
              <span className="material-symbols-outlined text-primary bg-primary-fixed p-2 rounded-lg">home_work</span>
            </div>
            <p className="font-headline-md text-headline-md text-primary font-bold">
              {formatCompact(stats.total)} Unit
            </p>
          </div>

          {/* Menunggu Verifikasi */}
          <div className="p-stack-md bg-white rounded-2xl card-shadow border border-outline-variant border-l-4 border-l-tertiary flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <span className="font-label-md text-on-surface-variant uppercase tracking-wider">Menunggu</span>
              <span className="material-symbols-outlined text-tertiary bg-tertiary-fixed p-2 rounded-lg">pending</span>
            </div>
            <p className="font-headline-md text-headline-md text-tertiary-container font-bold">
              {formatCompact(stats.pending)}
            </p>
          </div>

          {/* Terverifikasi */}
          <div className="p-stack-md bg-secondary/5 rounded-xl shadow-sm border border-outline-variant flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <span className="font-label-md text-on-surface-variant uppercase tracking-wider">Terverifikasi</span>
              <span className="material-symbols-outlined text-secondary bg-secondary-container p-2 rounded-lg">verified</span>
            </div>
            <p className="font-headline-md text-headline-md text-secondary font-bold">
              {formatCompact(stats.verified)}
            </p>
          </div>

          {/* Ditolak */}
          <div className="p-stack-md bg-error/5 rounded-2xl shadow-sm border border-outline-variant flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <span className="font-label-md text-on-surface-variant uppercase tracking-wider">Ditolak</span>
              <span className="material-symbols-outlined text-error bg-error/10 p-2 rounded-lg">block</span>
            </div>
            <p className="font-headline-md text-headline-md text-error font-bold">
              {formatCompact(stats.rejected)}
            </p>
          </div>
        </div>

        {globalError && (
          <div className="mt-4 rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error">
            {globalError}
          </div>
        )}
        {actionError && (
          <div className="mt-4 rounded-lg border border-error/20 bg-error/10 p-3 text-sm text-error">
            {actionError}
          </div>
        )}
{/* ── Daftar verifikasi + filter tabs ── */}
        <div className="mt-8 flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-on-surface tracking-tight">Antrean Verifikasi Kos</h2>
          <span className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-tertiary-fixed text-on-tertiary-container">
            {filtered.length} Kos
          </span>
        </div>

        <div className="flex flex-wrap gap-1 bg-surface-container-low p-1 rounded-xl w-fit mb-6">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                filter === f.key
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-outline block mb-3">verified_user</span>
            <h3 className="font-title-lg text-title-lg text-on-surface font-bold">
              Tidak ada kos di daftar &quot;{filterLabel}&quot;
            </h3>
            <p className="text-body-md text-on-surface-variant mt-1 max-w-sm mx-auto">
              {filter === "semua"
                ? "Belum ada kos di platform."
                : `Belum ada kos dengan status &quot;${filterLabel}&quot;.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {filtered.map((kos: any) => {
              const isRejected = kos.verification_status === "rejected";
              return (
                <div key={kos.id} className="group bg-white rounded-2xl overflow-hidden border border-outline-variant card-shadow hover:card-shadow-hover transition-all h-full flex flex-col sm:flex-row">
                  {/* Foto — 40% kiri, placeholder SAMA dgn KosCard.tsx */}
                  <div className="relative w-full sm:w-2/5 min-h-40 bg-surface-container-high overflow-hidden flex-shrink-0">
                    {kos.foto?.[0] ? (
                      <Image
                        src={kos.foto[0]}
                        alt={`Foto kos ${kos.name}`}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, 40vw"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-lowest relative overflow-hidden">
                        <div
                          className="absolute inset-0 opacity-[0.35]"
                          style={{
                            backgroundImage:
                              "linear-gradient(rgba(0,35,111,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(0,35,111,0.12) 1px, transparent 1px)",
                            backgroundSize: "28px 28px",
                          }}
                        />
                        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary/20 to-primary/10 flex items-center justify-center mb-1.5">
                          <span className="material-symbols-outlined text-3xl text-secondary-fixed">home</span>
                        </div>
                        <span className="text-[11px] font-semibold text-on-surface-variant/80 relative">Foto menyusul</span>
                        <span className="text-[10px] text-on-surface-variant/50 relative">Pemilik sedang mengunggah</span>
                      </div>
                    )}
                    {/* Badge status di atas foto */}
                    <div className="absolute top-3 left-3 z-10">{statusBadge(kos)}</div>
                  </div>

                  {/* Info — kanan */}
                  <div className="flex-1 p-4 md:p-5 flex flex-col">
<h3 className="font-title-lg text-body-lg text-on-surface font-bold group-hover:text-primary transition-colors">
                      {kos.name}
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 line-clamp-1">
                      <span className="material-symbols-outlined text-[15px] mr-1 align-middle text-outline">location_on</span>
                      {kos.address ?? "-"}
                    </p>

                    {/* Pemilik + tanggal */}
                    <div className="flex items-center gap-2 mt-3">
                      <div className="w-8 h-8 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center text-xs font-bold uppercase">
                        {initials(kos.owner?.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-on-surface-variant truncate">
                          {kos.owner?.full_name ?? "Pemilik belum diisi"}
                        </p>
                        <p className="text-[11px] text-outline">Ajukan {formatDate(kos.created_at)}</p>
                      </div>
                    </div>

                    {isRejected && kos.rejection_reason && (
                      <p className="mt-2 text-xs text-error/90 bg-error/5 rounded-lg px-3 py-2 line-clamp-2">
                        <span className="font-semibold">Alasan penolakan:</span> {kos.rejection_reason}
                      </p>
                    )}

                    {/* Aksi */}
                    <div className="flex items-center gap-2 mt-auto pt-4">
                      <form action={approveAction}>
                        <input type="hidden" name="kosId" value={kos.id} />
                        <Button
                          type="submit"
                          variant="secondary"
                          disabled={actionPending}
                          className="!px-3 !py-1.5 !text-xs !font-bold"
                        >
                          {approvePending && actionPending ? "..." : "Setujui"}
                        </Button>
                      </form>
                      <Button
                        type="button"
                        variant="danger"
                        disabled={actionPending}
                        className="!px-3 !py-1.5 !text-xs !font-bold"
                        onClick={() => { setRejectTarget(kos); setRejectReason(""); }}
                      >
                        {rejectPending && actionPending ? "..." : "Tolak"}
                      </Button>
                      <Link
                        href={`/admin/kos/${kos.id}`}
                        className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary-fixed rounded-lg transition-all"
                        title="Detail Verifikasi"
                      >
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
{/* ── Pagination — tetap ── */}
        <div className="mt-6 px-6 py-4 bg-white rounded-xl border border-outline-variant card-shadow flex items-center justify-between">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Menampilkan 1-{filtered.length} dari {stats.total} Kos
          </p>
          <div className="flex gap-2">
            <button
              disabled
              aria-label="Halaman sebelumnya"
              className="p-2 rounded-lg border border-outline-variant text-on-surface-variant transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button
              disabled
              aria-label="Halaman berikutnya"
              className="p-2 rounded-lg border border-outline-variant text-on-surface-variant transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal Tolak Verifikasi — alasan wajib minimal 10 karakter ── */}
      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Tolak Verifikasi Kos">
        <form action={rejectAction} className="space-y-4 pt-2">
          <input type="hidden" name="kosId" value={rejectTarget?.id} />
          <p className="text-on-surface-variant font-body-md text-sm">
            Beri alasan jelas agar pemilik kos tahu kenapa ditolak dan apa yang perlu perbaiki untuk submit ulang (minimal 10 karakter).
          </p>
          <textarea
            name="reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Contoh: foto tidak jelas, deskripsi tidak lengkap, lokasi tidak akurat..."
            className="w-full rounded-lg border border-outline-variant px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          {rejectReason.trim().length > 0 && rejectReason.trim().length < 10 && (
            <p className="text-xs text-error mt-1">Alasan penolakan minimal 10 karakter.</p>
          )}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="ghost" onClick={() => setRejectTarget(null)}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={actionPending || rejectReason.trim().length < 10}
            >
              {actionPending ? "Memproses..." : "Tolak Kos"}
            </Button>
          </div>
        </form>
      </Modal>
    </AdminShell>
  );
}