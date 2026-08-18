import Link from "next/link";
import Logo from "@/components/ui/Logo";
import Footer from "@/components/layout/Footer";

export default function PartnerPage() {
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-outline-variant/20">
        <div className="max-w-7xl mx-auto px-4 md:px-10">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <Logo variant="full" className="h-12 w-auto text-primary" />
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/kos" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200">
                Cari Kos
              </Link>
              <Link href="/about" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200">
                Tentang Kami
              </Link>
              <Link href="/contact" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200">
                Bantuan
              </Link>
            </nav>
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login" className="px-5 py-2.5 text-sm font-semibold text-primary rounded-full hover:bg-primary/10 transition-all duration-200">
                Login
              </Link>
              <Link href="/register" className="px-5 py-2.5 text-sm font-semibold text-on-primary bg-primary rounded-full hover:opacity-90 active:scale-95 transition-all duration-200">
                Register
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-[70vh] flex items-center justify-center px-4 pt-16">
        <div className="text-center max-w-md">
          <span className="material-symbols-outlined text-primary text-6xl block mb-4">handshake</span>
          <h1 className="font-headline-lg text-headline-lg md:text-4xl font-bold text-on-surface mb-3">
            Partner with Us
          </h1>
          <p className="text-body-sm text-on-surface-variant mb-6">
            Halaman kemitraan NestU sedang disiapkan. Segera hadir — nantikan informasi
            bekerja sama dengan sekolah dan institusi.
          </p>
          <Link
            href="/contact"
            className="inline-block px-6 py-3 text-sm font-semibold text-on-primary bg-primary rounded-full hover:opacity-90 active:scale-95 transition-all duration-200"
          >
            Hubungi Tim Kami
          </Link>
        </div>
      </main>

      <Footer />
    </>
  );
}
