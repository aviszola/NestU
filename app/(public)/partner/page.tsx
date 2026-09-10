import Link from "next/link";

export default function PartnerPage() {
  return (
    <>
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

    </>
  );
}
