import Footer from "@/components/layout/Footer";
import PublicHeader from "@/components/layout/PublicHeader";

/**
 * Shared layout untuk halaman publik / SEO-marketing.
 *
 * Auto-render PublicHeader + Footer untuk SEMUA halaman di route grup
 * `(public)` — konsisten & central. Ini fixes class bug recurr:
 * header lama terpisah (hardcoded, tanpa link "Tim Pengembang") masih
 * dipakai pada /contact, /terms, /privacy, /partner.
 *
 * Route grup `(public)` tidak menambah segmen URL — /about, /contact,
 * dst. tetap sama. Halaman interaktif (mis. /contact, "use client")
 * bisa tetap client component sebagai `children` here, karena header
 * (server component PublicHeader) dirender dari layout — bukan dari page.
 */
export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <PublicHeader />
      {children}
      <Footer />
    </>
  );
}