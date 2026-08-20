/**
 * Satu-satunya sumber kebenaran untuk ikon fasilitas kos.
 * Dipakai di semua kartu/halaman (KosCard, /kos, /kos/[id], booking,
 * rental, owner kos) — JANGAN duplikasi mapping ini di file lain.
 *
 * Catatan: tabel `facilities` menyimpan ikon EMOJI (bukan Material Symbols)
 * — emoji ditolak di sini supaya semua UI pakai Material Symbols konsisten.
 */

// Mapping nama fasilitas (ter-normalisasi) -> ikon Material Symbols.
export const FACILITY_ICONS: Record<string, string> = {
  wifi: "wifi",
  ac: "ac_unit",
  ac_unit: "ac_unit",
  shower: "shower",
  "kamar mandi": "bathroom",
  "kamar mandi dalam": "bathroom",
  "kamar mandi luar": "bathroom",
  bathroom: "bathroom",
  dapur: "kitchen",
  "dapur umum": "kitchen",
  "dapur pribadi": "kitchen",
  kitchen: "kitchen",
  kulkas: "kitchen",
  listrik: "bolt",
  keamanan: "shield",
  "keamanan 24 jam": "shield",
  security: "shield",
  parkir: "local_parking",
  "parkir motor": "moped",
  parkir_motor: "moped",
  "parkir mobil": "local_parking",
  parkir_mobil: "local_parking",
  parking: "local_parking",
  tv: "tv",
  lemari: "checkroom",
  meja: "table_restaurant",
  desk: "table_restaurant",
  kasur: "bed",
  air: "water_drop",
  laundry: "local_laundry_service",
  "ruang tamu": "living",
  ruang_tamu: "living",
  "akses 24 jam": "schedule",
  akses_24jam: "schedule",
  cooking: "kitchen",
};

// Normalisasi: lowercase, hilangkan spasi berlebih, tanda hubung/garing bawah -> spasi.
function normalizeFacility(name: string): string {
  return name.toLowerCase().trim().replace(/[-_]/g, " ").replace(/\s+/g, " ");
}

// Emoji (ikon lama di tabel facilities) dianggap "tidak ada" -> fallback ke mapping nama.
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

/** Pilih ikon Material Symbols untuk satu fasilitas. */
export function facilityIcon(f: { name?: string; icon?: string | null }): string {
  if (f.icon && !EMOJI_RE.test(f.icon)) return f.icon;
  return FACILITY_ICONS[normalizeFacility(f.name ?? "")] ?? "check";
}

/** Ikon Material Symbols untuk satu nama fasilitas (tanpa objek). */
export function facilityIconByName(name: string): string {
  return FACILITY_ICONS[normalizeFacility(name)] ?? "check";
}

export { normalizeFacility };
