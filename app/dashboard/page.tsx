import { createClient } from "@/lib/supabase/server";
import { getFeaturedKos, getActiveBookings, getBookingCount } from "@/lib/supabase/queries";
import KosCard from "@/components/KosCard";
import BookingCard from "@/components/BookingCard";
import ScrollReveal from "@/components/ScrollReveal";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import BottomNav from "@/components/layout/BottomNav";
import Link from "next/link";
import { redirect } from "next/navigation";

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

  const [kosList, bookings, totalBooking] = await Promise.all([
    getFeaturedKos(supabase, 4),
    getActiveBookings(supabase, user.id, 2),
    getBookingCount(supabase, user.id),
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

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar activePage="search" userRole="siswa" userName={profile.full_name} />

      <div className="flex min-h-screen">
        <main className="flex-1 lg:ml-64">
          <TopNav userRole="siswa" userName={profile.full_name} />

          {/* ─── Hero + Search ─── */}
          <section className="relative py-12 md:py-16 px-4 overflow-hidden bg-on-surface">
            <div className="absolute inset-0 z-0">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary-container/20 z-10" />
              <div
                className="w-full h-full bg-cover bg-center opacity-20"
                style={{
                  backgroundImage: `url('https://images.unsplash.com/photo-1513258496099-48168024aec0?w=1920&q=80')`,
                }}
              />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto text-center">
              <ScrollReveal>
                <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
                  STUDENT PORTAL
                </h1>
                <p className="text-base md:text-lg text-white/80 mt-2">
                  Find your next home
                </p>
              </ScrollReveal>
              <ScrollReveal>
                <form action="/kos" method="GET" className="mt-6 max-w-xl mx-auto">
                  <div className="flex items-center bg-white rounded-full shadow-md border border-gray-200 overflow-hidden">
                    <span className="material-symbols-outlined text-gray-400 pl-4">search</span>
                    <input
                      type="text"
                      name="search"
                      placeholder="Cari tempat kos di sekitar sekolahmu..."
                      className="flex-1 px-3 py-3 outline-none bg-transparent text-sm"
                    />
                    <button
                      type="submit"
                      className="px-6 py-2 bg-primary text-white font-semibold rounded-full mr-2 hover:opacity-90 transition-opacity whitespace-nowrap"
                    >
                      Cari
                    </button>
                  </div>
                </form>
              </ScrollReveal>
            </div>
          </section>

          {/* ─── Kos Terbaru + Booking Sidebar ─── */}
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

              {/* Right: Booking Aktif + Quick Suggestions */}
              <div className="xl:col-span-4 space-y-6">
                {/* Booking Aktif */}
                <div className="rounded-xl border border-outline-variant bg-white overflow-hidden">
                  <div className="p-4 border-b border-outline-variant flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-on-surface">Booking Aktif</h3>
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-tertiary-fixed text-on-tertiary-container">
                      {totalBooking} Pesanan
                    </span>
                  </div>
                  <div className="divide-y divide-outline-variant p-3">
                    {bookings.length > 0 ? (
                      bookings.map((booking: any) => (
                        <div key={booking.id} className="mb-3 last:mb-0">
                          <BookingCard
                            booking={booking}
                            ownerName={ownerMap.get(booking.rooms?.kos?.owner_id)}
                          />
                        </div>
                      ))
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
