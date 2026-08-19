"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import OwnerShell from "@/components/layout/OwnerShell";
import {
  MAINT_STATUS,
  MAINT_CATEGORIES,
  categoryLabel,
  categoryIcon,
} from "@/lib/maintenance";
import {
  ValidationError,
  validateOptionalText,
} from "@/lib/validation";
import { toastSuccess, toastError } from "@/lib/toast";
import { toReadableError } from "@/lib/utils";

interface MaintenanceReport {
  id: string;
  booking_id: string;
  student_id: string;
  kos_id: string;
  owner_id: string;
  category: string;
  priority: string;
  description: string;
  photo_url: string;
  status: string;
  owner_response: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  student?: { full_name?: string; school_name?: string; phone?: string } | null;
  bookings?: {
    id?: string;
    rooms?: { room_number?: string; kos?: { name?: string } } | null;
  } | null;
}

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "baru", label: "Baru" },
  { key: "diproses", label: "Diproses" },
  { key: "selesai", label: "Selesai" },
];

function formatDate(d?: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OwnerReportsPage() {
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [detail, setDetail] = useState<MaintenanceReport | null>(null);
  const [photoLightbox, setPhotoLightbox] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [response, setResponse] = useState("");
  const [updating, setUpdating] = useState(false);

  async function loadReports() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: err } = await supabase
        .from("maintenance_reports")
        .select(
          "*, bookings:booking_id(id, rooms:room_id(room_number, kos:kos_id(name)))"
        )
        .order("created_at", { ascending: true });
      if (err) throw err;

      const rows = (data ?? []) as MaintenanceReport[];
      // Enrich student via profiles_public (owner boleh lihat via relasi)
      const studentIds = [...new Set(rows.map((r) => r.student_id))];
      let profileMap: Record<string, any> = {};
      if (studentIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles_public")
          .select("id, full_name, school_name, phone")
          .in("id", studentIds);
        profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));
      }

      // Urutkan: urgent duluan, lalu created_at naik (tertua menunggu paling atas)
      const enriched = rows.map((r) => ({ ...r, student: profileMap[r.student_id] ?? null }));
      enriched.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority === "urgent" ? -1 : 1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      setReports(enriched);
    } catch (err: any) {
      setError(toReadableError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  async function openDetail(r: MaintenanceReport) {
    setDetail(r);
    setNewStatus(r.status);
    setResponse(r.owner_response ?? "");
  }

  async function handleUpdate() {
    if (!detail) return;
    if (!["baru", "diproses", "selesai"].includes(newStatus)) {
      setError("Status tidak valid.");
      return;
    }
    try {
      // Validasi server-side (pola validation.ts)
      const cleanResponse = validateOptionalText(response, "Balasan pemilik", 1000);
      void cleanResponse;
      setUpdating(true);
      const supabase = createClient();
      const patch: any = { status: newStatus };
      if (response.trim()) patch.owner_response = response.trim().slice(0, 1000);

      const { error: updErr } = await supabase
        .from("maintenance_reports")
        .update(patch)
        .eq("id", detail.id);
      if (updErr) throw updErr;

      toastSuccess("Status laporan diperbarui. Notifikasi terkirim ke siswa.");
      setDetail(null);
      loadReports();
    } catch (err: any) {
      if (err instanceof ValidationError) {
        setError(err.message);
      } else {
        setError(toReadableError(err));
        toastError("Gagal memperbarui laporan: " + toReadableError(err));
      }
    } finally {
      setUpdating(false);
    }
  }

  const filtered =
    filter === "all" ? reports : reports.filter((r) => r.status === filter);

  const total = reports.length;
  const baruCount = reports.filter((r) => r.status === "baru").length;
  const urgentCount = reports.filter((r) => r.priority === "urgent" && r.status !== "selesai").length;

  const statCards = [
    { label: "Total Laporan", value: total, icon: "flag", iconCls: "text-tertiary bg-tertiary-fixed" },
    { label: "Belum Ditangani", value: baruCount, icon: "fiber_new", iconCls: "text-secondary bg-secondary-container" },
    { label: "Urgent Aktif", value: urgentCount, icon: "priority_high", iconCls: "text-error bg-error/10", valueCls: "text-error" },
  ];

  return (
    <OwnerShell activePage="reports">
      <section className="px-margin-mobile md:px-margin-desktop pt-6 md:pt-10 pb-2">
        <div className="relative overflow-hidden rounded-2xl bg-on-surface card-shadow">
          <div
            className="absolute inset-0 opacity-[0.07] pointer-events-none"
            style={{
              backgroundImage:
                "linear-gradient(rgba(11,28,48,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(11,28,48,0.6) 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="relative p-6 md:p-8">
            <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary-fixed backdrop-blur-sm">
              <span className="material-symbols-outlined !text-sm">report_problem</span>
              Maintenance Reports
            </p>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white text-balance">
              Kelola Laporan Masalah
            </h1>
            <p className="text-sm md:text-base text-white/70 max-w-md leading-relaxed">
              Tinjau dan tangani laporan masalah dari siswa. Urgent tampil paling atas, laporan terlama menunggu didahulukan.
            </p>
          </div>
        </div>
      </section>

      <div className="px-margin-mobile md:px-margin-desktop py-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="p-stack-md flex flex-col justify-between h-32 bg-white rounded-xl card-shadow border border-outline-variant"
            >
              <div className="flex justify-between items-start">
                <span className="font-label-md text-on-surface-variant uppercase tracking-wider">
                  {card.label}
                </span>
                <span className={`material-symbols-outlined p-2 rounded-lg ${card.iconCls}`}>
                  {card.icon}
                </span>
              </div>
              <p className={`font-headline-md text-headline-md font-bold ${card.valueCls ?? "text-primary"}`}>
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="mt-8 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-label-md font-bold transition-colors ${
                filter === f.key
                  ? "bg-primary-container text-on-primary-container"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {f.label}
              {f.key !== "all" && (
                <span className="ml-1.5 opacity-70">
                  ({reports.filter((r) => r.status === f.key).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-error/10 text-error p-3 text-sm font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-4 mt-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl card-shadow border border-outline-variant p-5 animate-pulse">
                <div className="h-4 w-1/2 bg-surface-container-high rounded-full mb-3" />
                <div className="h-3 w-1/3 bg-surface-container-high rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-6 rounded-3xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-outline block mb-3">fact_check</span>
            <h3 className="font-title-lg text-title-lg text-on-surface font-bold">
              Tidak ada laporan
            </h3>
            <p className="text-body-md text-on-surface-variant mt-1 max-w-sm mx-auto">
              Laporan masalah dari siswa akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {filtered.map((r) => {
              const st = MAINT_STATUS[r.status] ?? MAINT_STATUS.baru;
              return (
                <div
                  key={r.id}
                  className="bg-white rounded-2xl card-shadow border border-outline-variant overflow-hidden transition-shadow hover:card-shadow-hover cursor-pointer"
                  onClick={() => openDetail(r)}
                >
                  <div className="p-5 md:p-6">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {r.priority === "urgent" && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-error text-white text-xs font-bold">
                          <span className="material-symbols-outlined !text-[14px]">priority_high</span>
                          Urgent
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-bold">
                        <span className="material-symbols-outlined !text-[14px]">{categoryIcon(r.category)}</span>
                        {categoryLabel(r.category)}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${st.className}`}>
                        <span className="material-symbols-outlined !text-[14px]">{st.icon}</span>
                        {st.label}
                      </span>
                      <span className="ml-auto text-[11px] text-outline">
                        {formatDate(r.created_at)}
                      </span>
                    </div>
                    <p className="text-body-sm text-on-surface line-clamp-2 mb-2">{r.description}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-on-surface-variant">
                      <span className="inline-flex items-center gap-1">
                        <span className="material-symbols-outlined !text-[14px]">person</span>
                        {r.student?.full_name ?? "Siswa"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="material-symbols-outlined !text-[14px]">home</span>
                        {r.bookings?.rooms?.kos?.name ?? "Kos"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="material-symbols-outlined !text-[14px]">meeting_room</span>
                        Kamar {r.bookings?.rooms?.room_number ?? "-"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal detail + update status */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl card-shadow p-6 max-w-2xl w-full my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {detail.priority === "urgent" && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-error text-white text-xs font-bold">
                      <span className="material-symbols-outlined !text-[14px]">priority_high</span>
                      Urgent
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-bold">
                    <span className="material-symbols-outlined !text-[14px]">{categoryIcon(detail.category)}</span>
                    {categoryLabel(detail.category)}
                  </span>
                </div>
                <h3 className="font-title-lg text-title-lg text-on-surface font-bold">
                  Laporan dari {detail.student?.full_name ?? "Siswa"}
                </h3>
                <p className="text-body-sm text-on-surface-variant">
                  {detail.bookings?.rooms?.kos?.name ?? "Kos"} — Kamar {detail.bookings?.rooms?.room_number ?? "-"} · {formatDate(detail.created_at)}
                </p>
                {detail.student?.phone && (
                  <a
                    href={`https://wa.me/${detail.student.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-secondary text-sm font-semibold hover:underline mt-1"
                  >
                    <span className="material-symbols-outlined !text-[14px]">call</span>
                    Hubungi via WhatsApp
                  </a>
                )}
              </div>
              <button
                onClick={() => setDetail(null)}
                className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
                aria-label="Tutup"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-body-md text-on-surface bg-surface-container-low rounded-xl p-4 mb-4">
              {detail.description}
            </p>

            {/* Foto — klik untuk lightbox */}
            {detail.photo_url && (
              <button
                type="button"
                onClick={() => setPhotoLightbox(detail.photo_url)}
                className="block w-full mb-4"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={detail.photo_url}
                  alt="Foto laporan"
                  className="w-full max-h-80 object-cover rounded-xl border border-outline-variant"
                />
              </button>
            )}

            {detail.owner_response && (
              <div className="mb-4 rounded-lg bg-secondary/10 text-secondary p-3 text-sm">
                <p className="font-bold mb-0.5">Balasan sebelumnya:</p>
                {detail.owner_response}
              </div>
            )}

            {/* Update status */}
            <div className="border-t border-outline-variant pt-4">
              <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
                Update Status
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {["baru", "diproses", "selesai"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setNewStatus(s)}
                    className={`px-4 py-1.5 rounded-full text-label-md font-bold transition-colors ${
                      newStatus === s
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    {MAINT_STATUS[s]?.label ?? s}
                  </button>
                ))}
              </div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
                Balasan ke siswa <span className="text-outline">(opsional — disarankan saat Selesai)</span>
              </label>
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Contoh: Sudah diperbaiki. Terima kasih atas laporannya."
                className="w-full rounded-lg border border-outline-variant px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleUpdate}
                  disabled={updating}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:brightness-110 transition disabled:opacity-50"
                >
                  {updating ? "Menyimpan..." : "Simpan Status"}
                </button>
                <button
                  onClick={() => setDetail(null)}
                  className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant rounded-xl font-bold text-sm hover:bg-surface-container-low transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox foto */}
      {photoLightbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80" onClick={() => setPhotoLightbox(null)}>
          <div className="relative max-w-4xl w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoLightbox}
              alt="Foto laporan ukuran penuh"
              className="w-full max-h-[85vh] object-contain rounded-xl"
            />
            <button
              onClick={() => setPhotoLightbox(null)}
              className="absolute top-2 right-2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
              aria-label="Tutup"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      )}
    </OwnerShell>
  );
}
