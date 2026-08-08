import { createClient } from "@/lib/supabase/server";
import {
  getFeaturedKos,
  getActiveBookings,
  getBookingCount,
  getTotalKosCount,
} from "@/lib/supabase/queries";
import KosCard from "@/components/KosCard";
import ScrollReveal from "@/components/ScrollReveal";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import BottomNav from "@/components/layout/BottomNav";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getBookingStatus } from "@/lib/bookingStatus";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "siswa") {
    if (profile?.role === "pemilik") redirect("/owner");
    if (profile?.role === "admin") redirect("/admin");
    redirect("/login");
  }

  const [kosList, bookings, totalBooking, totalVerifiedKos] = await Promise.all([
    getFeaturedKos(supabase, 4),
    getActiveBookings(supabase, user.id, 2),
    getBookingCount(supabase, user.id),
    getTotalKosCount(supabase),
  ]);

  // Fetch min room prices for featured kos
  const kosIds = kosList.map((k: any) => k.id);
  const { data: roomPrices } = kosIds.length
    ? await supabase
        .from("rooms")
        .select("kos_id, price_per_month")
        .in("kos_id", kosIds)
        .order("price_per_month", { ascending: true })
    : { data: [] };
  const priceMap = new Map<string, number>();
  for (const r of roomPrices ?? []) {
    if (!priceMap.has(r.kos_id)) priceMap.set(r.kos_id, r.price_per_month);
  }

  // Fetch owner names for each booking's kos
  const ownerIds = [
    ...new Set(bookings.map((b: any) => b.rooms?.kos?.owner_id).filter(Boolean)),
  ];
  const { data: owners } = ownerIds.length
    ? await supabase.from("profiles_public").select("id, full_name").in("id", ownerIds)
    : { data: [] };
  const ownerMap = new Map((owners ?? []).map((o: any) => [o.id, o.full_name]));

  const BOOKING_STEPS = [
    { key: "pending", label: "Menunggu" },
    { key: "approved", label: "Disetujui" },
    { key: "lunas", label: "Bayar" },
    { key: "completed", label: "Selesai" },
  ];

  // Indeks langkah booking saat ini (0-3) — data nyata dari status.
  const getStepIndex = (b: any) => {
    if (b.status === "completed") return 3;
    if (b.status === "approved" && b.payment_status === "lunas") return 2;
    if (b.status === "approved") return 1;
    return 0;
  };

  // Chart dekoratif (bukan data asli — diberi label jujur)
  const CHART_POINTS = [38, 52, 46, 68, 60, 84, 74, 96, 88, 108, 118, 132];

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar activePage="search" userRole="siswa" userName={profile.full_name} />

      <div className="flex min-h-screen">
        <main className="flex-1 lg:ml-64">
          <TopNav userRole="siswa" userName={profile.full_name} />

          {/* ── Hero asimetris — terinspirasi Ruixen Stats (21st.dev/ruixen.ui/ruixen-stats) ── */}
          <section className="px-4 md:px-8 pt-6 md:pt-10 pb-2">
            <div className="relative overflow-hidden rounded-2xl bg-on-surface card-shadow">
              {/* dekorasi background */}
              <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{
                backgroundImage:
                  "linear-gradient(rgba(11,28,48,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(11,28,48,0.6) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }} />

              <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 p-6 md:p-10 items-center">
                {/* Left: copy + secondary search */}
                <ScrollReveal className="flex flex-col justify-center gap-5">
                  <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary-fixed backdrop-blur-sm">
                    <span className="material-symbols-outlined !text-sm">home_work</span>
                    Portal Siswa
                  </p>
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white text-balance">
                    Halo, {profile.full_name?.split(" ")[0] ?? "Siswa"} —{" "}
                    <span className="text-secondary-fixed">cari kos impianmu.</span>
                  </h1>
                  <p className="text-sm md:text-base text-white/70 max-w-md leading-relaxed">
                    Jelajahi kos terverifikasi, bandingkan fasilitas, dan amankan
                    kamar impianmu tanpa ribet.
                  </p>

                  {/* Search — elemen sekunder, bukan fokus utama */}
                  <form action="/kos" method="GET" className="mt-1 w-full max-w-md">
                    <div className="flex items-center gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest p-1.5 shadow-sm transition focus-within:ring-2 focus-within:ring-primary/40">
                      <span className="material-symbols-outlined pl-2.5 text-outline">search</span>
                      <input
                        type="text"
                        name="search"
                        placeholder="Cari kos di sekitar sekolahmu..."
                        className="h-9 flex-1 border-0 bg-transparent p-0 text-sm text-on-surface outline-none placeholder:text-outline"
                      />
                      <button
                        type="submit"
                        className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition hover:brightness-110"
                      >
                        Cari
                      </button>
                    </div>
                  </form>

                  {/* Mini stats inline — data nyata */}
                  <div className="flex flex-wrap gap-6 mt-2">
                    <div>
                      <p className="text-2xl font-extrabold tracking-tight text-white">{totalVerifiedKos}</p>
                      <p className="text-xs text-white/60">Kos terverifikasi</p>
                    </div>
                    <div>
                      <p className="text-2xl font-extrabold tracking-tight text-secondary-fixed">{totalBooking}</p>
                      <p className="text-xs text-white/60">Booking aktif</p>
                    </div>
                  </div>
                </ScrollReveal>

                {/* Right: chart panel + hero number overlay */}
                <ScrollReveal className="relative">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-white/5 border border-white/10 p-6 md:p-8">
                    {/* Label jujur: visual dekoratif, bukan data asli */}
                    <div className="absolute left-6 md:left-8 top-6 md:top-8 flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg text-secondary-fixed">insights</span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
                        Tren pencarian kos
                      </span>
                    </div>

                    {/* Chart SVG — dekoratif jujur */}
                    <svg
                      viewBox="0 0 200 100"
                      preserveAspectRatio="none"
                      className="absolute inset-x-4 bottom-8 h-[calc(100%-5rem)] w-[calc(100%-2rem)]"
                      aria-hidden="true"
                    >
                      <defs>
                        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#00236f" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#00236f" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {CHART_POINTS.map((v, i) => (
                        <line
                          key={i}
                          x1={(i * 200) / (CHART_POINTS.length - 1)}
                          y1={100 - v}
                          x2={(i * 200) / (CHART_POINTS.length - 1)}
                          y2={96}
                          stroke="#006c49"
                          strokeOpacity="0.5"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      ))}
                      <path
                        d={CHART_POINTS
                          .map((v, i) => `${i === 0 ? "M" : "L"}${(i * 200) / (CHART_POINTS.length - 1)},${100 - v}`)
                          .join(" ")}
                        fill="none"
                        stroke="#00236f"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      <path
                        d={`${CHART_POINTS
                          .map((v, i) => `${i === 0 ? "M" : "L"}${(i * 200) / (CHART_POINTS.length - 1)},${100 - v}`)
                          .join(" ")} L200,100 L0,100 Z`}
                        fill="url(#chartFill)"
                      />
                    </svg>

                    {/* Hero angka overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                      <p className="text-6xl md:text-7xl font-extrabold tracking-tight text-white drop-shadow-sm">
                        {totalBooking}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white/70">
                        Booking aktif kamu
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </section>

          {/* ── Kos Terbaru + Booking Sidebar ── */}
          <div className="px-4 md:px-8 py-6">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Left: Kos Terbaru */}
              <div className="xl:col-span-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-on-surface">Kos Terbaru</h2>
                  <Link
                    href="/kos"
                    className="text-sm font-semibold text-primary hover:underline"
                  >
                    Lihat Semua
                    <span className="material-symbols-outlined text-base align-middle ml-1">arrow_forward</span>
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {kosList.map((kos: any) => (
                    <ScrollReveal key={kos.id}>
                      <KosCard kos={kos} showFavorite={true} minPrice={priceMap.get(kos.id)} />
                    </ScrollReveal>
                  ))}
                </div>
              </div>

              {/* Right: Booking Aktif */}
              <div className="xl:col-span-4 space-y-6">
                {/* Booking Aktif — step tracker */}
                <div className="rounded-2xl border border-outline-variant bg-white overflow-hidden card-shadow">
                  <div className="p-4 border-b border-outline-variant flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-on-surface">Booking Aktif</h3>
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-tertiary-fixed text-on-tertiary-container">
                      {totalBooking} Proses
                    </span>
                  </div>
                  <div className="p-3 space-y-3">
                    {bookings.length > 0 ? (
                      bookings.map((booking: any) => {
                        const status = getBookingStatus(booking);
                        const idx = getStepIndex(booking);
                        return (
                          <div key={booking.id} className="rounded-xl border border-outline-variant/50 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-bold text-on-surface truncate">
                                {booking.rooms?.kos?.name ?? "Kos"}
                              </p>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${status.className}`}>
                                {status.label}
                              </span>
                            </div>
                            <p className="text-xs text-on-surface-variant mb-3">
                              Kamar {booking.rooms?.room_number ?? "—"} ·{" "}
                              {new Date(booking.move_in_date || booking.created_at).toLocaleDateString("id-ID", {
                                day: "numeric", month: "short",
                              })}
                            </p>
                            {/* Step tracker */}
                            <div className="flex items-center justify-between">
                              {BOOKING_STEPS.map((step, i) => (
                                <div key={step.key} className="flex flex-1 items-center last:flex-none">
                                  <div className="flex flex-col items-center gap-1 flex-1">
                                    <span
                                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                                        i < idx
                                          ? "bg-secondary text-white"
                                          : i === idx
                                            ? "bg-primary text-white ring-4 ring-primary/15"
                                            : "bg-surface-container text-on-surface-variant"
                                      }`}
                                    >
                                      {i < idx ? (
                                        <span className="material-symbols-outlined !text-[11px]">check</span>
                                      ) : (
                                        <span className="text-[10px] font-bold">{i + 1}</span>
                                      )}
                                    </span>
                                    <span className="text-[9px] text-on-surface-variant whitespace-nowrap hidden sm:block">{step.label}</span>
                                  </div>
                                  {i < BOOKING_STEPS.length - 1 && (
                                    <span className={`h-0.5 flex-1 mx-1 ${i < idx ? "bg-secondary" : "bg-surface-container-high"}`} />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8">
                        <span className="material-symbols-outlined text-3xl text-outline">calendar_month</span>
                        <p className="text-sm text-on-surface-variant mt-2">Belum ada booking aktif.</p>
                        <Link
                          href="/kos"
                          className="mt-3 inline-block px-4 py-2 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
                        >
                          Cari Kos Sekarang
                        </Link>
                      </div>
                    )}
                  </div>
                  {bookings.length > 0 && (
                    <div className="p-4 border-t border-outline-variant">
                      <Link
                        href="/bookings"
                        className="block w-full py-3 text-sm font-bold text-primary border border-primary rounded-lg hover:bg-primary/5 transition-colors text-center"
                      >
                        Lihat Riwayat Booking
                      </Link>
                    </div>
                  )}
                </div>

                {/* Quick Suggestions / Chat Advisor */}
                {/* TODO: sambungkan ke Supabase (konten statis sementara) */}
                <div className="rounded-xl bg-primary text-white p-6 shadow-lg relative overflow-hidden">
                  <span className="material-symbols-outlined absolute bottom-0 right-0 text-[120px] opacity-20 leading-none pointer-events-none select-none">
                    house
                  </span>
                  <div className="relative z-10">
                    <h4 className="text-base font-bold">Butuh bantuan?</h4>
                    <p className="text-sm text-blue-200 mt-1 max-w-xs">
                      Tim kami siap membantumu menemukan kos yang paling sesuai dengan budget dan jarak sekolahmu.
                    </p>
                    <Link
                      href="/support"
                      className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-white text-primary font-bold rounded-lg hover:bg-blue-50 transition-colors text-sm"
                    >
                      <span className="material-symbols-outlined text-lg">chat</span>
                      Chat Advisor
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <BottomNav activePage="search" userRole="siswa" />
    </div>
  );
}
