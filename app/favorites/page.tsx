import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import FavoriteButton from "@/components/FavoriteButton";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import BottomNav from "@/components/layout/BottomNav";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // role guard — siswa only
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");
  if (profile.role !== "siswa") redirect("/dashboard");

  const { data: rawList } = await supabase
    .from("favorites")
    .select("kos_id, kos:kos_id(*, kos_facilities(facility_id, facility:facility_id(name)))")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  const kosList = (rawList ?? []).map((row: any) => {
    if (!row.kos) return null;
    const { kos_facilities, ...restKos } = row.kos;
    return {
      ...restKos,
      fasilitas: (kos_facilities ?? []).map((kf: any) => ({
        id: kf.facility_id,
        name: kf.facility?.name ?? kf.facility_id,
      })),
    };
  }).filter(Boolean);

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar activePage="favorites" userRole="siswa" userName={profile.full_name} />

      <div className="flex min-h-screen">
        <main className="flex-1 lg:ml-64">
          <TopNav userRole="siswa" userName={profile.full_name} />

          <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-xl md:text-2xl font-bold text-on-surface">
                Kos Favorit Saya
              </h1>
              <p className="text-sm text-outline mt-1">
                {kosList.length > 0
                  ? `Kamu memiliki ${kosList.length} kos favorit`
                  : "Belum ada kos favorit"}
              </p>
            </div>

            {!kosList || kosList.length === 0 ? (
              <div className="text-center py-16">
                <span className="material-symbols-outlined text-5xl text-outline mb-4">
                  favorite_border
                </span>
                <p className="text-base font-medium text-on-surface-variant mb-2">
                  Belum ada favorit
                </p>
                <p className="text-sm text-outline mb-6">
                  Tambahkan kos favoritmu dengan menekan ikon hati pada kartu properti
                </p>
                <Link
                  href="/kos"
                  className="inline-flex px-6 py-2.5 bg-primary text-on-primary text-sm font-bold rounded-lg hover:opacity-90 transition-opacity"
                >
                  Cari Kos
                </Link>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {kosList.map((kos: any) => (
                  <div
                    key={kos.id}
                    className="group relative overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm hover:shadow-md transition-all"
                  >
                    <Link href={`/kos/${kos.id}`}>
                      {kos.foto?.[0] && (
                        <div className="aspect-[16/9] overflow-hidden relative">
                          <Image
                            src={kos.foto[0]}
                            alt={kos.name}
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-cover transition group-hover:scale-105"
                          />
                        </div>
                      )}
                      <div className="p-4">
                        <h2 className="text-base font-semibold text-on-surface">
                          {kos.name}
                        </h2>
                        <p className="mt-1 text-sm text-on-surface-variant line-clamp-2">
                          {kos.address}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                          {kos.distance_to_school_km !== null && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                              {kos.distance_to_school_km} km
                            </span>
                          )}
                          {kos.fasilitas?.slice(0, 3).map((f: any) => (
                            <span
                              key={f.id}
                              className="rounded-full bg-surface-container px-2 py-0.5"
                            >
                              {f.name}
                            </span>
                          ))}
                          {(kos.fasilitas?.length ?? 0) > 3 && (
                            <span className="text-outline">
                              +{kos.fasilitas.length - 3} lagi
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                    <div className="absolute right-3 top-3">
                      <FavoriteButton
                        kosId={kos.id}
                        initialFavorited={true}
                        loggedIn={true}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <BottomNav activePage="favorites" userRole="siswa" />
    </div>
  );
}
