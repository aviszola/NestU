import { createClient } from "@/lib/supabase/server";
import { getKosList, getFacilities } from "@/lib/supabase/queries";
import KosCard from "@/components/KosCard";
import FilterSidebar from "@/components/kos/FilterSidebar";
import FilterChips from "@/components/kos/FilterChips";
import MapToggleButton from "@/components/kos/MapToggleButton";
import Pagination from "@/components/Pagination";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import PublicNav from "@/components/layout/PublicNav";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";

export default async function KosPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    minPrice?: string;
    maxPrice?: string;
    type?: string;
    facilities?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const supabase = await createClient();

  const awaitedParams = await searchParams;

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user ?? null;

  let isSiswa = false;
  let favoriteIds: Set<string> = new Set();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isSiswa = profile?.role === "siswa";
    if (isSiswa) {
      const { data: favs } = await supabase
        .from("favorites")
        .select("kos_id")
        .eq("student_id", user.id);
      if (favs) favoriteIds = new Set(favs.map((f: any) => f.kos_id));
    }
  }

  const search = awaitedParams.search || "";
  const minPrice = awaitedParams.minPrice
    ? parseInt(awaitedParams.minPrice)
    : undefined;
  const maxPrice = awaitedParams.maxPrice
    ? parseInt(awaitedParams.maxPrice)
    : undefined;
  const type = awaitedParams.type || "";
  const facilities = awaitedParams.facilities
    ? awaitedParams.facilities.split(",")
    : [];
  const sort = (awaitedParams.sort || "newest") as
    | "newest"
    | "cheapest"
    | "expensive"
    | "rating";
  const page = awaitedParams.page ? parseInt(awaitedParams.page) : 1;
  const limit = 8;

  // Fetch data
  const [kosResult, allFacilities] = await Promise.all([
    getKosList(supabase, {
      search,
      minPrice,
      maxPrice,
      type: type || undefined,
      facilities: facilities.length > 0 ? facilities : undefined,
      sort,
      page,
      limit,
    }),
    getFacilities(supabase),
  ]);

  const { data: kosList, total } = kosResult;
  const totalPages = Math.ceil(total / limit);

  // Fetch cheapest room prices for displayed kos
  let minPriceMap: Record<string, number> = {};
  if (kosList.length > 0) {
    const kosIds = kosList.map((k) => k.id);
    const { data: rooms } = await supabase
      .from("rooms")
      .select("kos_id, price_per_month")
      .in("kos_id", kosIds)
      .eq("status", "tersedia")
      .order("price_per_month", { ascending: true });

    if (rooms) {
      for (const r of rooms) {
        if (minPriceMap[r.kos_id] === undefined) {
          minPriceMap[r.kos_id] = r.price_per_month;
        }
      }
    }
  }

  const kosWithFav = kosList.map((k) => ({
    ...k,
    isFavorited: favoriteIds.has(k.id),
  }));

  return (
    <>
      <PublicNav />

      {/* ─── HERO + SEARCH BAR ─── */}
      <section className="relative py-12 px-4 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary-container/10 z-10" />
          <div
            className="w-full h-full bg-cover bg-center opacity-30"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=80')`,
            }}
          />
        </div>
        <div className="relative z-20 max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-primary tracking-tight leading-tight">
            Temukan Kos Impianmu
          </h1>
          <p className="text-base md:text-lg font-normal text-on-surface-variant mt-2 max-w-xl mx-auto leading-relaxed">
            Hunian aman dan nyaman untuk mendukung prestasimu.
          </p>

          <form action="/kos" method="GET" className="mt-8 max-w-2xl mx-auto">
            <div className="flex items-center bg-white rounded-full shadow-lg border border-outline-variant/50 overflow-hidden focus-within:ring-2 focus-within:ring-primary/20">
              <span className="material-symbols-outlined text-outline pl-5">
                search
              </span>
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Cari berdasarkan sekolah atau daerah..."
                className="flex-1 px-4 py-4 outline-none bg-transparent text-sm md:text-base font-normal text-on-surface"
              />
              <button
                type="submit"
                className="px-6 md:px-8 py-3 bg-primary text-on-primary font-semibold text-sm rounded-full mr-2 hover:opacity-90 active:scale-95 transition-all duration-200"
              >
                Cari Sekarang
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ─── MAIN CONTENT ─── */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* FILTER SIDEBAR (Desktop) */}
          <aside className="lg:w-72 flex-shrink-0 hidden lg:block">
            <FilterSidebar
              facilities={allFacilities}
              selectedFacilities={facilities}
              minPrice={minPrice}
              maxPrice={maxPrice}
              selectedType={type}
              currentSort={sort}
            />
          </aside>

          {/* RESULTS */}
          <div className="flex-1">
            {/* Header Results */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-on-surface tracking-tight">
                    Kos di Sekitar Kamu
                  </h2>
                  <p className="text-sm font-normal text-on-surface-variant mt-0.5">
                    Menampilkan {total} hasil{" "}
                    {search ? `untuk "${search}"` : ""}
                  </p>
                </div>
                <MapToggleButton />
              </div>

              {/* Mobile Filter Chips */}
              <div className="lg:hidden mb-4">
                <FilterChips
                  facilities={allFacilities}
                  selectedFacilities={facilities}
                  minPrice={minPrice}
                  maxPrice={maxPrice}
                  selectedType={type}
                  currentSort={sort}
                />
              </div>

            {/* Grid Kos */}
            {kosWithFav.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {kosWithFav.map((kos) => (
                  <KosCard
                    key={kos.id}
                    kos={kos}
                    showFavorite={!!user}
                    minPrice={minPriceMap[kos.id]}
                    showRating
                    showDistance
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-6xl text-gray-300 block mb-4">
                  search_off
                </span>
                <h3 className="text-xl font-semibold text-gray-600">
                  Tidak ada kos ditemukan
                </h3>
                <p className="text-gray-400 mt-2">
                  Coba ubah kata kunci atau filter pencarian Anda.
                </p>
                <Link
                  href="/kos"
                  className="mt-5 inline-flex px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-lg hover:opacity-90 transition-opacity"
                >
                  Lihat Semua Kos
                </Link>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  basePath="/kos"
                />
              </div>
            )}
          </div>
        </div>
      </main>

            <Footer />

      <BottomNav activePage="search" userRole="siswa" />
    </>
  );
}
