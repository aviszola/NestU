"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  MAINT_CATEGORIES,
  MAINT_PRIORITIES,
  uploadMaintenancePhoto,
} from "@/lib/maintenance";
import {
  ValidationError,
  validateRequiredText,
  validateOptionalText,
} from "@/lib/validation";
import { toastSuccess, toastError } from "@/lib/toast";
import { toReadableError } from "@/lib/utils";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface-container-low font-body-md text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none";

export default function ReportPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<string>("");
  const [priority, setPriority] = useState<string>("normal");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // ── VALIDASI CLIENT ──
    if (!category) {
      setError("Pilih kategori masalah.");
      return;
    }
    if (!photo) {
      setError("Foto wajib diunggah sebelum mengirim laporan.");
      return;
    }
    if (photo.size > 5 * 1024 * 1024) {
      setError("Ukuran foto maksimal 5 MB.");
      return;
    }
    if (!photo.type.startsWith("image/")) {
      setError("Foto harus berupa file gambar.");
      return;
    }

    // ── VALIDASI SERVER-SIDE (pola validation.ts) ──
    let cleanDesc: string;
    try {
      cleanDesc = validateRequiredText(description, "Deskripsi", 2000);
      validateOptionalText(category, "Kategori", 50);
      if (priority !== "urgent" && priority !== "normal") {
        throw new ValidationError("Prioritas tidak valid.");
      }
    } catch (err: any) {
      setError(err instanceof ValidationError ? err.message : "Data tidak valid.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/login?redirect=${window.location.pathname}`);
        return;
      }
      const { bookingId } = await params;

      // Upload foto dulu → baru insert laporan
      const photoUrl = await uploadMaintenancePhoto(supabase, bookingId, photo);

      const { data, error: insErr } = await supabase
        .from("maintenance_reports")
        .insert({
          booking_id: bookingId,
          student_id: user.id,
          category,
          priority,
          description: cleanDesc,
          photo_url: photoUrl,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      toastSuccess("Laporan masalah terkirim ke pemilik kos.");
      router.push(`/rental/${bookingId}?report=success`);
    } catch (err: any) {
      setError(toReadableError(err));
      toastError("Gagal mengirim laporan: " + toReadableError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 md:px-8 py-3 bg-surface-container-low/80 backdrop-blur-md border-b border-outline-variant">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
            aria-label="Kembali"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-lg font-semibold text-on-surface">Laporkan Masalah</h1>
        </div>
      </header>

      <main className="px-margin-mobile md:px-margin-desktop pt-stack-lg pb-32 max-w-2xl mx-auto w-full">
        <div className="mb-stack-lg">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary-fixed px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary mb-3">
            <span className="material-symbols-outlined !text-sm">report_problem</span>
            Maintenance Report
          </p>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Laporkan Masalah Kamar</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-xl">
            Jelaskan kerusakan atau keluhan agar pemilik kos dapat menindaklanjuti.
          </p>
        </div>

        {error && (
          <div className="mb-stack-md rounded-lg bg-error/10 text-error p-3 text-sm font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-stack-lg">
          {/* Kategori */}
          <div className="bg-white p-5 rounded-2xl border border-outline-variant card-shadow">
            <label className="block font-label-md text-label-md text-on-surface-variant mb-3">
              Kategori * 
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputCls}
            >
              <option value="">Pilih kategori...</option>
              {MAINT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Prioritas */}
          <div className="bg-white p-5 rounded-2xl border border-outline-variant card-shadow">
            <label className="block font-label-md text-label-md text-on-surface-variant mb-3">
              Prioritas
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MAINT_PRIORITIES.map((p) => (
                <label
                  key={p.value}
                  className={`flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                    priority === p.value
                      ? p.value === "urgent"
                        ? "border-error bg-error/5"
                        : "border-primary bg-primary/5"
                      : "border-outline-variant hover:border-primary/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="priority"
                    value={p.value}
                    checked={priority === p.value}
                    onChange={() => setPriority(p.value)}
                    className="mt-1 accent-[var(--color-primary)]"
                  />
                  <div>
                    <p className={`font-bold text-sm flex items-center gap-1 ${
                      p.value === "urgent" ? "text-error" : "text-on-surface"
                    }`}>
                      <span className="material-symbols-outlined !text-[16px]">{p.icon}</span>
                      {p.label}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{p.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Deskripsi */}
          <div className="bg-white p-5 rounded-2xl border border-outline-variant card-shadow">
            <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
              Deskripsi Masalah *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder="Contoh: AC kamar tidak dingin, lampu kamar mandi mati, ada kebocoran..."
              className={inputCls}
            />
            <p className="text-xs text-outline mt-1 text-right">{description.length}/2000</p>
          </div>

          {/* Foto */}
          <div className="bg-white p-5 rounded-2xl border border-outline-variant card-shadow">
            <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
              Foto Masalah * <span className="text-outline">(wajib, max 5MB)</span>
            </label>
            {photoPreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="Pratinjau foto masalah"
                  className="w-full max-h-64 object-cover rounded-xl border border-outline-variant"
                />
                <button
                  type="button"
                  onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                  className="absolute top-2 right-2 p-2 rounded-full bg-error text-white text-sm hover:brightness-110 transition"
                  aria-label="Hapus foto"
                >
                  <span className="material-symbols-outlined !text-[16px]">close</span>
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-outline-variant rounded-xl p-8 cursor-pointer hover:border-primary/50 transition-colors text-center">
                <span className="material-symbols-outlined text-4xl text-outline">add_a_photo</span>
                <span className="text-sm font-medium text-on-surface">Klik untuk memilih foto</span>
                <span className="text-xs text-on-surface-variant">JPG, PNG, WEBP — maksimal 5 MB</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (!f.type.startsWith("image/")) {
                      setError("Foto harus berupa file gambar.");
                      return;
                    }
                    if (f.size > 5 * 1024 * 1024) {
                      setError("Ukuran foto maksimal 5 MB.");
                      return;
                    }
                    setPhoto(f);
                    setPhotoPreview(URL.createObjectURL(f));
                  }}
                />
              </label>
            )}
          </div>

          {/* Aksi */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined !text-[18px]">send</span>
              {submitting ? "Mengirim laporan..." : "Kirim Laporan"}
            </button>
            <Link
              href="/rental"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-outline-variant text-on-surface-variant rounded-xl font-bold text-sm hover:bg-surface-container-low transition"
            >
              Batal
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
