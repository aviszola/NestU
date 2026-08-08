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
          <h1 className="text-4xl md:text-5xl font-bold text-primary tracking-tight">
            Temukan Kos Impianmu
          </h1>
          <p className="text-lg text-on-surface-variant mt-2">
            Hunian aman dan nyaman untuk mendukung prestasimu.
          </p>

          <form action="/kos" method="GET" className="mt-8 max-w-2xl mx-auto">
            <div className="flex items-center bg-white rounded-full shadow-lg border border-gray-200 overflow-hidden">
              <span className="material-symbols-outlined text-gray-400 pl-5">
                search
              </span>
              <input
                type="text"
                name="search"
                defaultValue={search}
                placeholder="Cari berdasarkan sekolah atau daerah..."
                className="flex-1 px-4 py-4 outline-none bg-transparent text-base"
              />
              <button
                type="submit"
                className="px-8 py-3 bg-primary text-white font-semibold rounded-full mr-2 hover:opacity-90 transition-colors"
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
                  <h2 className="text-2xl font-bold text-primary">
                    Kos di Sekitar Kamu
                  </h2>
                  <p className="text-sm text-gray-500">
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

      {/* ─── FOOTER ─── */}
      <footer className="bg-[#0b1c30] text-white py-12 px-4 mt-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
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
                <span className="material-symbols-outlined text-[16px]">
                  mail
                </span>
                halo@netsu.id
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">
                  call
                </span>
                (021) 1234–5678
              </span>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-white/80">
              Tautan Cepat
            </h4>
            <ul className="mt-3 space-y-2">
              {[
                { label: "About Us", href: "/about" },
                { label: "Terms of Service", href: "/terms" },
                { label: "Privacy Policy", href: "/privacy" },
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
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-white/80">
              Kontak Kami
            </h4>
            <ul className="mt-3 space-y-2">
              {[
                { label: "Contact Support", href: "/contact" },
                { label: "Partner with Us", href: "/partner" },
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
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-sm text-white/40">
            &copy; 2024 NestU. Academic Reliability &amp;
            Community Warmth.
          </p>
        </div>
      </footer>
    </>
  );
}
