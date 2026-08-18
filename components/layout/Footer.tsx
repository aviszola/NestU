import Logo from "@/components/ui/Logo";
import Link from "next/link";

/** Satu-satunya footer NestU — dipakai di semua halaman publik. */
export default function Footer() {
  return (
    <footer className="bg-[#0b1c30] text-white py-12 px-4 mt-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="md:col-span-2">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Logo variant="full" className="h-11 w-auto text-white" />
          </Link>
          <p className="text-sm text-white/60 mt-3 max-w-md leading-relaxed">
            Misi kami adalah menyediakan hunian yang terjangkau, aman, dan
            nyaman bagi seluruh pelajar di Indonesia.
          </p>
          <div className="flex gap-6 mt-4 text-sm text-white/60">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">mail</span>
              halo@netsu.id
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">call</span>
              (021) 1234–5678
            </span>
          </div>
        </div>

        {/* Tautan Cepat */}
        <div>
          <h4 className="font-semibold text-sm uppercase tracking-wider text-white/80">
            Tautan Cepat
          </h4>
          <ul className="mt-3 space-y-2">
            {[
              { label: "Tentang Kami", href: "/about" },
              { label: "Syarat & Ketentuan", href: "/terms" },
              { label: "Kebijakan Privasi", href: "/privacy" },
            ].map((l) => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Kontak */}
        <div>
          <h4 className="font-semibold text-sm uppercase tracking-wider text-white/80">
            Kontak
          </h4>
          <ul className="mt-3 space-y-2">
            {[
              { label: "Bantuan", href: "/contact" },
              { label: "Cari Kos", href: "/kos" },
            ].map((l) => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  className="text-sm text-white/60 hover:text-white transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          {/* Badge kepatuhan */}
          <div className="flex items-center gap-2 mt-4">
            <span className="px-3 py-1 text-[10px] font-bold text-white/80 bg-white/10 rounded-full">
              ISO 27001 Certified
            </span>
            <span className="px-3 py-1 text-[10px] font-bold text-white/80 bg-white/10 rounded-full">
              Verified by OJK
            </span>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-white/10 text-center">
        <p className="text-sm text-white/40">
          &copy; {new Date().getFullYear()} NestU. Academic Reliability &amp;
          Community Warmth.
        </p>
      </div>
    </footer>
  );
}
