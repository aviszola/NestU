/**
 * Utilitas SEO — konstanta dan helper untuk generateMetadata di semua halaman.
 * Satu sumber kebenaran untuk canonical URL base, title template, OG default.
 */

/** Base URL produksi. Baca dari env (set di Vercel / .env.local),
 *  fallback ke localhost untuk dev. Tidak punya trailing slash. */
export const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export const SITE_NAME = "NestU";

/** Title template: "<nama halaman> | NestU" */
export function makeTitle(pageTitle: string): string {
  return `${pageTitle} | ${SITE_NAME}`;
}

/** OG image fallback global (dipakai kalau halaman tidak punya foto). */
export const OG_DEFAULT_IMAGE = `${SITE_URL}/images/og-default.jpg`;

/** Gambar logo untuk structured data. */
export const LOGO_URL = `${SITE_URL}/images/logo-full.svg`;

/**
 * Potong teks ke panjang maksimal, tambah "…" jika dipotong.
 * Dipakai untuk menjaga description di 140-160 karakter.
 */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}
