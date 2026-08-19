/**
 * Validasi input server-side (digunakan sebelum INSERT/UPDATE ke DB).
 * Semua form NestU tulis langsung ke Supabase via client — helper ini
 * adalah satu-satunya guard sebelum data masuk DB.
 *
 * Aturan:
 * - trim spasi
 * - buang tag HTML/script (sanitize dasar anti-stored-XSS di non-React context)
 * - batasi panjang (name 100, deskripsi 2000, catatan 500)
 * - validasi format (WA, angka)
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/** Buang tag HTML/script + control chars, normalisasi whitespace. */
export function sanitizeText(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "") // buang tag HTML (termasuk <script>...</script>)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "") // control chars
    .replace(/\s+/g, " ")
    .trim();
}

/** Trim, sanitasi, wajib ada isi, batas panjang. Return teks bersih. */
export function validateRequiredText(
  raw: string,
  field: string,
  maxLen: number
): string {
  const clean = sanitizeText(raw ?? "");
  if (!clean) throw new ValidationError(`${field} wajib diisi.`);
  if (clean.length > maxLen)
    throw new ValidationError(`${field} maksimal ${maxLen} karakter.`);
  return clean;
}

/** Opsional: sanitasi + batas panjang, null jika kosong. */
export function validateOptionalText(
  raw: string | null | undefined,
  field: string,
  maxLen: number
): string | null {
  if (!raw) return null;
  const clean = sanitizeText(raw);
  if (!clean) return null;
  if (clean.length > maxLen)
    throw new ValidationError(`${field} maksimal ${maxLen} karakter.`);
  return clean;
}

const PHONE_RE = /^62[1-9][0-9]{7,12}$/;

/** Normalisasi WA + validasi format 62xxxxxxxxxx (8-13 digit). */
export function validatePhone(raw: string, field = "Nomor WhatsApp"): string {
  const digits = (raw ?? "").replace(/[^0-9]/g, "");
  const normalized = digits.startsWith("0") ? "62" + digits.slice(1) : digits;
  if (!PHONE_RE.test(normalized))
    throw new ValidationError(`${field} tidak valid. Contoh: 081234567890.`);
  return normalized;
}

/** Batasi jumlah emoji/glyph non-ASCII — cegah teks aneh + abuse. */
export function validateEmojiLimit(raw: string, field: string, max = 20): void {
  const matches = raw.match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu);
  if (matches && matches.length > max)
    throw new ValidationError(`${field} mengandung terlalu banyak emoji.`);
}
