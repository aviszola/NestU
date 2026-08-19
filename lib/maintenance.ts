/**
 * Maintenance reports — konstanta, validasi, upload foto.
 * Satu-satunya sumber kebenaran untuk label/badge kategori & status
 * laporan masalah (dipakai halaman siswa + owner).
 */

export const MAINT_BUCKET = "maintenance-photos";
export const MAINT_MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export const MAINT_CATEGORIES = [
  { value: "listrik_elektronik", label: "Listrik & Elektronik", icon: "bolt" },
  { value: "air_plumbing", label: "Air & Plumbing", icon: "water_drop" },
  { value: "kebersihan", label: "Kebersihan", icon: "cleaning_services" },
  { value: "keamanan", label: "Keamanan", icon: "security" },
  { value: "fasilitas_rusak", label: "Fasilitas Rusak", icon: "home_repair_service" },
  { value: "lainnya", label: "Lainnya", icon: "more_horiz" },
] as const;

export type MaintenanceCategory = (typeof MAINT_CATEGORIES)[number]["value"];

export const MAINT_PRIORITIES = [
  { value: "normal", label: "Normal", icon: "schedule", desc: "Ditangani dalam beberapa hari" },
  { value: "urgent", label: "Urgent", icon: "priority_high", desc: "Mendesak — perlu ditangani segera" },
] as const;

export type MaintenancePriority = (typeof MAINT_PRIORITIES)[number]["value"];

export const MAINT_STATUS: Record<
  string,
  { label: string; className: string; icon: string }
> = {
  baru: { label: "Baru", className: "bg-tertiary/10 text-tertiary", icon: "fiber_new" },
  diproses: { label: "Diproses", className: "bg-primary/10 text-primary", icon: "engineering" },
  selesai: { label: "Selesai", className: "bg-secondary/10 text-secondary", icon: "task_alt" },
};

export function categoryLabel(cat: string): string {
  return MAINT_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

export function categoryIcon(cat: string): string {
  return MAINT_CATEGORIES.find((c) => c.value === cat)?.icon ?? "more_horiz";
}

/** Validasi file foto laporan: wajib image, max 5MB. Throw Error dgn pesan ID. */
export function validateMaintenancePhoto(file: File): void {
  if (!file.type.startsWith("image/")) {
    throw new Error("Foto harus berupa file gambar (JPG, PNG, WEBP, dll).");
  }
  if (file.size > MAINT_MAX_SIZE) {
    throw new Error("Ukuran foto maksimal 5 MB.");
  }
}

/** Upload foto laporan ke bucket publik maintenance-photos. Return public URL. */
export async function uploadMaintenancePhoto(
  client: any,
  bookingId: string,
  file: File
): Promise<string> {
  validateMaintenancePhoto(file);
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `reports/${bookingId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await client.storage
    .from(MAINT_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  const { data: { publicUrl } } = client.storage.from(MAINT_BUCKET).getPublicUrl(path);
  return publicUrl;
}
