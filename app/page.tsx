import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getFeaturedKos, getTotalKosCount, getKosMinPrices } from "@/lib/supabase/queries";
import ScrollReveal from "@/components/ScrollReveal";
import KosCard from "@/components/KosCard";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import Logo from "@/components/ui/Logo";

const HERO_IMG =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&q=80";

const TRUST_ITEMS = [
  {
    icon: "verified",
    title: "Terverifikasi",
    desc: "Semua hunian telah memenuhi standar kualitas dan keamanan.",
  },
  {
    icon: "visibility",
    title: "Transparan",
    desc: "Sistem pembayaran aman dan tanpa biaya tersembunyi.",
  },
  {
    icon: "favorite",
    title: "Community Warmth",
    desc: "Didukung oleh sekolah dan sesama siswa.",
  },
];

const STEPS = [
  { num: 1, title: "Cari Kos", desc: "Gunakan fitur cerdas untuk menemukan hunian di sekitar sekolahmu." },
  { num: 2, title: "Ajukan Booking", desc: "Isi data diri dan pilih durasi sewa yang kamu inginkan." },
  { num: 3, title: "Pemilik Setujui", desc: "Pemilik akan meninjau profil siswa untuk memastikan kecocokan." },
  { num: 4, title: "Pembayaran Aman", desc: "Bayar melalui sistem kami. Dana baru akan diteruskan setelah kamu check-in." },
];

const PAYMENT_METHODS = ["Bank Transfer", "E-Wallet", "Virtual Account"];

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: { role?: string; full_name?: string } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  const kosList = await getFeaturedKos(supabase, 3);
  const totalKos = await getTotalKosCount(supabase);
  const minPrices = await getKosMinPrices(supabase, kosList.map((kos) => kos.id));

  const dashboardLink = profile?.role === "siswa"
    ? "/dashboard"
    : profile?.role === "pemilik"
    ? "/owner"
    : profile?.role === "admin"
    ? "/admin"
    : null;

  return (
    <>
      {/* ===== HEADER ===== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-outline-variant/20">
        <div className="max-w-7xl mx-auto px-4 md:px-10">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <Logo variant="full" className="h-12 w-auto text-primary" />
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link
                href="/kos"
                className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200"
              >
                Cari Kos
              </Link>
              <Link
                href="/about"
                className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200"
              >
                Tentang Kami
              </Link>
              <Link
                href="/contact"
                className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200"
              >
                Bantuan
              </Link>
            </nav>
            <div className="hidden md:flex items-center gap-3">
              {user && profile?.full_name ? (
                <>
                  <span className="text-sm font-semibold text-on-surface-variant">{profile.full_name}</span>
                  <Link
                    href={dashboardLink || "/"}
                    className="px-5 py-2.5 text-sm font-semibold text-on-primary bg-primary rounded-full hover:opacity-90 active:scale-95 transition-all duration-200"
                  >
                    Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-5 py-2.5 text-sm font-semibold text-primary rounded-full hover:bg-primary/10 transition-all duration-200"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="px-5 py-2.5 text-sm font-semibold text-on-primary bg-primary rounded-full hover:opacity-90 active:scale-95 transition-all duration-200"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
            <button
              id="menuToggle"
              className="md:hidden p-2 rounded-lg hover:bg-surface-container-low transition-colors"
              aria-label="Menu"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-2xl">menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="relative min-h-[540px] md:min-h-[620px] flex items-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-on-surface">
          <Image
            src={HERO_IMG}
            alt="Student living"
            fill
            sizes="100vw"
            className="object-cover opacity-60"
            priority
          />
        </div>
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-16 md:py-20">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
              Temukan Kos
              <br />
              Impianmu
            </h1>
            <p className="mt-4 text-base md:text-lg font-normal text-white/85 max-w-lg leading-relaxed">
              Hunian aman dan nyaman untuk mendukung prestasimu.
            </p>
            <form
              action="/kos"
              method="GET"
              className="mt-8 flex items-center bg-white rounded-full shadow-lg border border-gray-300 overflow-hidden max-w-lg focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-200"
            >
              <span className="material-symbols-outlined text-gray-400 pl-5">search</span>
              <input
                type="text"
                name="search"
                placeholder="Cari kos berdasarkan lokasi atau sekolah..."
                className="flex-1 px-4 py-3.5 text-sm font-normal text-on-surface bg-transparent border-none outline-none focus:ring-0"
              />
              <button
                type="submit"
                className="m-0.5 px-6 py-3 bg-primary text-on-primary text-sm font-semibold rounded-full hover:opacity-90 active:scale-95 transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-base">search</span>
                Cari
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ===== TRUST ===== */}
      <section className="py-16 md:py-20 -mt-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TRUST_ITEMS.map((item, i) => (
              <ScrollReveal
                key={item.title}
                className="rounded-2xl p-6 card-shadow bg-white border border-outline-variant/40 hover:shadow-lg transition-all duration-300"
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-primary text-2xl">{item.icon}</span>
                </div>
                <h3 className="text-lg font-bold text-on-surface leading-snug">{item.title}</h3>
                <p className="mt-2 text-sm font-normal text-on-surface-variant leading-relaxed">{item.desc}</p>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURED KOS ===== */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight">Kos di Sekitar Kamu</h2>
              <p className="mt-1 text-sm font-normal text-on-surface-variant leading-relaxed">
                Menampilkan {totalKos} kos tersedia
              </p>
            </div>
            <Link
              href="/kos"
              className="hidden sm:inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
            >
              Lihat Semua
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {kosList.length > 0 ? (
              kosList.map((kos, i) => (
                <ScrollReveal key={kos.id} style={{ transitionDelay: `${i * 0.1}s` }}>
                  <KosCard kos={{ ...kos, isFavorited: false }} showFavorite={false} minPrice={minPrices[kos.id]} />
                </ScrollReveal>
              ))
            ) : (
              <p className="col-span-3 text-center text-sm font-normal text-on-surface-variant py-12">
                Belum ada kos tersedia saat ini.
              </p>
            )}
          </div>
          <div className="mt-6 sm:hidden text-center">
            <Link
              href="/kos"
              className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
            >
              Lihat Semua
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight">Mudahnya Booking</h2>
            <p className="mt-2 text-sm font-normal text-on-surface-variant leading-relaxed">Proses transparan untuk keamanan bersama.</p>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-6 relative">
            {STEPS.map((step, i) => (
              <ScrollReveal
                key={step.num}
                className={`text-center relative ${i < STEPS.length - 1 ? "step-connector" : ""}`}
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <div className="flex justify-center">
                  <div className="step-number">{step.num}</div>
                </div>
                <h3 className="mt-4 text-base font-bold text-on-surface leading-snug">{step.title}</h3>
                <p className="mt-1 text-sm font-normal text-on-surface-variant leading-relaxed">{step.desc}</p>
              </ScrollReveal>
            ))}
          </div>
          <ScrollReveal className="mt-10 p-5 rounded-2xl bg-surface-container-low border border-outline-variant/50 flex items-start gap-3 max-w-3xl mx-auto">
            <span className="material-symbols-outlined text-primary text-xl mt-0.5 shrink-0">info</span>
            <p className="text-sm font-normal text-on-surface-variant leading-relaxed">
              Pembayaran hanya dilakukan setelah booking disetujui oleh pemilik kos. Dana Anda akan ditahan oleh sistem NestU untuk menjamin keamanan hingga proses check-in selesai.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== PAYMENT MOCKUP ===== */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <ScrollReveal>
              <h2 className="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight">
                Pembayaran yang Jujur &amp; Transparan
              </h2>
              <p className="mt-4 text-sm font-normal text-on-surface-variant leading-relaxed">
                Tidak ada biaya tersembunyi. Semua rincian biaya ditampilkan secara jelas sebelum Anda melakukan transaksi. Kami bekerja sama dengan institusi perbankan resmi untuk menjamin keamanan dana Anda.
              </p>
              <div className="mt-6 space-y-3">
                {PAYMENT_METHODS.map((method) => (
                  <div key={method} className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-secondary-container flex items-center justify-center">
                      <span className="material-symbols-outlined text-sm text-on-secondary-container">check</span>
                    </span>
                    <span className="text-sm font-semibold text-on-surface">{method}</span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
            <ScrollReveal style={{ transitionDelay: "0.15s" }}>
              <div className="rounded-2xl p-6 md:p-8 card-shadow bg-white border border-outline-variant/40">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-on-surface leading-snug">Rincian Pembayaran</h3>
                  <span className="px-2.5 py-0.5 text-[10px] font-semibold text-outline uppercase tracking-wider bg-surface-container-high rounded-full">Contoh ilustrasi</span>
                </div>
                <div className="mt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-normal text-on-surface-variant">Harga Sewa (1 Bulan)</span>
                    <span className="text-sm font-bold text-on-surface">Rp 1.850.000</span>
                  </div>
                  <div className="border-t border-outline-variant/50" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-normal text-on-surface-variant">Biaya Layanan</span>
                    <span className="text-sm font-bold text-on-surface">Rp 25.000</span>
                  </div>
                  <div className="border-t border-outline-variant/50" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-normal text-on-surface-variant">Biaya Admin</span>
                    <span className="text-sm font-bold text-on-surface">Rp 5.000</span>
                  </div>
                  <div className="border-t border-outline-variant/50" />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-base font-bold text-on-surface">Total Pembayaran</span>
                    <span className="text-base font-extrabold text-primary">Rp 1.880.000</span>
                  </div>
                </div>
                <button className="mt-6 w-full py-3.5 bg-primary text-on-primary text-sm font-bold rounded-full hover:bg-[#001a55] transition-all duration-200">
                  Ajukan Booking Sekarang
                </button>
                <p className="mt-3 text-xs font-normal text-on-surface-variant text-center leading-relaxed">
                  Dengan mengklik tombol di atas, Anda menyetujui Syarat &amp; Ketentuan Layanan NestU.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <Footer />

      {/* ===== MOBILE BOTTOM NAV — shared ===== */}
      <BottomNav activePage="search" userRole="siswa" />
    </>
  );
}
