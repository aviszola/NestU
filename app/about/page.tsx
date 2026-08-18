import Link from "next/link";
import Logo from "@/components/ui/Logo";
import Footer from "@/components/layout/Footer";

const VALUES = [
  {
    icon: "verified",
    title: "Terverifikasi",
    desc: "Setiap kos di NestU melewati proses verifikasi pemilik dan hunian, sehingga kamu tahu tempat yang kamu pilih benar-benar layak huni.",
  },
  {
    icon: "visibility",
    title: "Transparan",
    desc: "Harga jelas, fasilitas tertera, dan proses booking terbuka dari awal hingga akhir. Tanpa biaya tersembunyi.",
  },
  {
    icon: "favorite",
    title: "Community Warmth",
    desc: "Kami percaya tempat tinggal yang baik adalah yang penuh kehangatan — didukung sekolah, sesama siswa, dan pemilik kos yang peduli.",
  },
];

const STATS = [
  { value: "50+", label: "Sekolah Mitra" },
  { value: "500+", label: "Kos Terdaftar" },
  { value: "10K+", label: "Siswa Terbantu" },
];

export default function AboutPage() {
  return (
    <>
      {/* Header — konsisten dgn homepage */}
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
              <Link href="/about" className="text-sm font-semibold text-primary transition-colors duration-200">
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

      {/* Hero */}
      <section className="pt-16 bg-gradient-to-b from-primary-container/30 to-surface">
        <div className="max-w-4xl mx-auto px-4 md:px-10 py-16 md:py-24 text-center">
          <p className="text-label-md font-bold text-primary uppercase tracking-widest mb-3">
            Tentang NestU
          </p>
          <h1 className="font-headline-lg text-headline-lg md:text-5xl font-bold text-on-surface leading-tight mb-6">
            Hunian aman &amp; terverifikasi untuk{" "}
            <span className="text-primary">setiap pelajar</span>
          </h1>
          <p className="text-body-lg text-on-surface-variant leading-relaxed max-w-2xl mx-auto">
            NestU adalah platform pencarian dan booking kos yang menghubungkan
            pelajar dengan hunian terverifikasi di sekitar sekolah maupun
            kampus. Kami mempermudah proses mencari, memilih, dan menyewa kamar
            — dengan standar kualitas dan keamanan yang terjamin.
          </p>
        </div>
      </section>

      {/* Misi */}
      <section className="max-w-4xl mx-auto px-4 md:px-10 py-14">
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 p-8 md:p-10 shadow-[0_4px_20px_rgba(30,58,138,0.05)]">
          <h2 className="font-headline-md text-headline-md font-bold text-primary mb-4">
            Misi Kami
          </h2>
          <p className="text-body-md text-on-surface-variant leading-relaxed">
            Setiap pelajar berhak atas tempat tinggal yang aman, nyaman, dan
            terjangkau. Kami membangun ekosistem hunian pelajar yang
            transparan: pemilik kos bisa menemukan penghuni yang tepat, dan
            pelajar bisa menemukan rumah kedua yang terpercaya — tanpa
            perantara yang membingungkan, tanpa biaya tersembunyi.
          </p>
          <p className="text-body-md text-on-surface-variant leading-relaxed mt-4">
            Dari verifikasi hunian hingga pembayaran yang aman, setiap langkah
            dirancang agar kamu bisa fokus pada hal yang benar-benar penting:
            pendidikan dan masa depanmu.
          </p>
        </div>
      </section>

      {/* Nilai */}
      <section className="max-w-6xl mx-auto px-4 md:px-10 pb-14">
        <h2 className="font-headline-md text-headline-md font-bold text-on-surface text-center mb-10">
          Nilai yang Kami Pegang
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {VALUES.map((v) => (
            <div
              key={v.title}
              className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 shadow-[0_4px_20px_rgba(30,58,138,0.05)] hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-primary-container rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-on-primary-container">
                  {v.icon}
                </span>
              </div>
              <h3 className="font-title-lg text-title-lg font-bold text-on-surface mb-2">
                {v.title}
              </h3>
              <p className="text-body-sm text-on-surface-variant leading-relaxed">
                {v.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Statistik */}
      <section className="bg-primary-container/20 border-y border-outline-variant/30">
        <div className="max-w-5xl mx-auto px-4 md:px-10 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-headline-lg text-headline-lg font-bold text-primary">
                {s.value}
              </p>
              <p className="text-label-md text-on-surface-variant mt-1">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 md:px-10 py-14 text-center">
        <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-4">
          Siap menemukan hunianmu?
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/kos"
            className="px-6 py-3 text-sm font-semibold text-on-primary bg-primary rounded-full hover:opacity-90 active:scale-95 transition-all duration-200"
          >
            Cari Kos Sekarang
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 text-sm font-semibold text-primary border border-primary rounded-full hover:bg-primary/10 transition-all duration-200"
          >
            Daftar Sebagai Pemilik
          </Link>
        </div>
      </section>
          <Footer />
    </>
  );
}
