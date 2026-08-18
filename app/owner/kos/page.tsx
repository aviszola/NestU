import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import OwnerShell from "@/components/layout/OwnerShell";
import ScrollReveal from "@/components/ScrollReveal";

export const dynamic = "force-dynamic";

// Format helpers (server-safe)
function formatCompact(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "rb";
  return n.toLocaleString("id-ID");
}

export default async function OwnerKosListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "pemilik") redirect("/dashboard");

  // Fetch all kos milik owner
  const { data: kosListRaw } = await supabase
    .from("kos")
    .select("id, name, address, verification_status, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const kosList = kosListRaw ?? [];
  const totalProperti = kosList.length;

  // Room & booking stats per kos
  const kosIds = kosList.map((k) => k.id);

  let totalRooms = 0;
  let availableRooms = 0;
  let totalBookings = 0;
  let kosRoomsMap: Record<string, { total: number; available: number }> = {};
  let kosBookingsMap: Record<string, number> = {};

  if (kosIds.length > 0) {
    const { data: rooms } = await supabase
      .from("rooms")
      .select("id, kos_id, status")
      .in("kos_id", kosIds);

    if (rooms) {
      totalRooms = rooms.length;
      availableRooms = rooms.filter((r) => r.status === "tersedia").length;

      for (const r of rooms) {
        if (!kosRoomsMap[r.kos_id]) kosRoomsMap[r.kos_id] = { total: 0, available: 0 };
        kosRoomsMap[r.kos_id].total++;
        if (r.status === "tersedia") kosRoomsMap[r.kos_id].available++;
      }
    }

    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, room_id")
      .in("room_id", (rooms ?? []).map((r) => r.id));

    if (bookings) {
      totalBookings = bookings.length;
      for (const b of bookings) {
        const rm = (rooms ?? []).find((r) => r.id === b.room_id);
        if (rm) {
          kosBookingsMap[rm.kos_id] = (kosBookingsMap[rm.kos_id] ?? 0) + 1;
        }
      }
    }
  }

  const okupansi =
    totalRooms > 0
      ? ((totalRooms - availableRooms) / totalRooms) * 100
      : 0;

  return (
    <OwnerShell activePage="properties">
      {/* ── Header asimetris — pola sama dgn dashboard siswa ── */}
      <section className="px-margin-mobile md:px-margin-desktop pt-6 md:pt-10 pb-2">
        <div className="relative overflow-hidden rounded-2xl bg-on-surface card-shadow">
          {/* Grid pattern halus — konsisten dgn hero dashboard */}
          <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{
            backgroundImage:
              "linear-gradient(rgba(11,28,48,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(11,28,48,0.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }} />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5 p-6 md:p-8">
            <ScrollReveal className="space-y-2">
              <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary-fixed backdrop-blur-sm">
                <span className="material-symbols-outlined !text-sm">home_work</span>
                Properti Saya
              </p>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white text-balance">
                Kelola Properti Anda
              </h1>
              <p className="text-sm md:text-base text-white/70 max-w-md leading-relaxed">
                Pantau performa, ketersediaan unit, dan booking kos Anda dalam satu dasbor.
              </p>
            </ScrollReveal>

            <ScrollReveal>
              <Link
                href="/owner/kos/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary rounded-xl font-bold hover:bg-secondary-fixed transition-colors shadow-md"
              >
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                <span>Tambah Kos Baru</span>
              </Link>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Stat cards — hierarki radius/shadow beda per kartu ── */}
      <div className="px-margin-mobile md:px-margin-desktop py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {/* Total Properti — rounded-xl + card-shadow */}
          <div className="p-stack-md bg-white rounded-xl card-shadow border border-outline-variant flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <span className="font-label-md text-on-surface-variant uppercase tracking-wider">
                Total Properti
              </span>
              <span className="material-symbols-outlined text-primary bg-primary-fixed p-2 rounded-lg">
                home_work
              </span>
            </div>
            <p className="font-headline-md text-headline-md text-primary font-bold">
              {formatCompact(totalProperti)} Unit
            </p>
          </div>

          {/* Okupansi — rounded-2xl + accent border kiri (beda bentuk) */}
          <div className="p-stack-md bg-white rounded-2xl card-shadow border border-outline-variant border-l-4 border-l-secondary flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <span className="font-label-md text-on-surface-variant uppercase tracking-wider">
                Okupansi
              </span>
              <span className="material-symbols-outlined text-secondary bg-secondary-container p-2 rounded-lg">
                pie_chart
              </span>
            </div>
            <p className="font-headline-md text-headline-md text-secondary font-bold">
              {okupansi.toFixed(1)}%
            </p>
          </div>

          {/* Total Booking — rounded-xl + tint bg + shadow beda */}
          <div className="p-stack-md bg-secondary/5 rounded-xl shadow-sm border border-outline-variant flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <span className="font-label-md text-on-surface-variant uppercase tracking-wider">
                Total Booking
              </span>
              <span className="material-symbols-outlined text-tertiary bg-tertiary-fixed p-2 rounded-lg">
                event_available
              </span>
            </div>
            <p className="font-headline-md text-headline-md text-tertiary-container font-bold">
              {formatCompact(totalBookings)}
            </p>
          </div>
        </div>

        {/* ── Grid properti — 2 kolom, kartu besar, foto ~40% ── */}
        <div className="mt-8 flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-on-surface">Daftar Properti</h2>
          <span className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-tertiary-fixed text-on-tertiary-container">
            {totalProperti} Properti
          </span>
        </div>

        {kosList.length === 0 ? (
          /* ── Empty state — rounded-3xl dashed, beda hierarki ── */
          <div className="rounded-3xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center">
            <span className="material-symbols-outlined text-5xl text-outline block mb-3">store</span>
            <h3 className="font-title-lg text-title-lg text-on-surface font-bold">Belum ada properti</h3>
            <p className="text-body-md text-on-surface-variant mt-1 max-w-sm mx-auto">
              Klik &quot;Tambah Kos Baru&quot; untuk memulai dan kelola unit kos pertama Anda.
            </p>
            <Link
              href="/owner/kos/new"
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-semibold hover:brightness-110 transition-all"
            >
              <span className="material-symbols-outlined text-lg">add_circle</span>
              Tambah Kos Baru
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {kosList.map((kos, idx) => {
              const rm = kosRoomsMap[kos.id] ?? { total: 0, available: 0 };
              const bCount = kosBookingsMap[kos.id] ?? 0;
              const isVerified = kos.verification_status === "verified";
              const okupansiKos = rm.total > 0 ? ((rm.total - rm.available) / rm.total) * 100 : 0;

              return (
                <ScrollReveal key={kos.id} className={idx % 2 === 1 ? "md:translate-y-4" : ""}>
                  <div className="group bg-white rounded-2xl overflow-hidden border border-outline-variant card-shadow hover:card-shadow-hover transition-all h-full flex flex-col sm:flex-row">
                    {/* Foto — 40% kiri, placeholder SAMA dgn KosCard.tsx */}
                    <div className="relative w-full sm:w-2/5 min-h-40 bg-surface-container-high overflow-hidden flex-shrink-0">
                      <div className="absolute inset-0">
                        {isVerified ? (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-lowest relative overflow-hidden">
                            <div
                              className="absolute inset-0 opacity-[0.35]"
                              style={{
                                backgroundImage:
                                  "linear-gradient(rgba(0,35,111,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(0,35,111,0.12) 1px, transparent 1px)",
                                backgroundSize: "28px 28px",
                              }}
                            />
                            <span className="material-symbols-outlined text-3xl text-primary/30 relative">photo_camera</span>
                            <span className="text-[11px] font-medium text-on-surface-variant/70 relative">
                              Foto belum tersedia
                            </span>
                          </div>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-tertiary/10 via-surface-container to-surface-container-lowest relative overflow-hidden">
                            <span className="material-symbols-outlined text-3xl text-tertiary/40 relative">pending_actions</span>
                            <span className="text-[11px] font-medium text-on-surface-variant/70 relative">
                              Menunggu Verifikasi
                            </span>
                          </div>
                        )}
                      </div>
                      {/* Badge status di atas foto */}
                      <div className="absolute top-3 left-3 z-10">
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/90 text-white text-[10px] font-bold backdrop-blur-sm">
                            <span className="material-symbols-outlined !text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                            Terverifikasi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-tertiary/90 text-white text-[10px] font-bold backdrop-blur-sm">
                            <span className="material-symbols-outlined !text-[12px]">pending</span>
                            Menunggu
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Info — kanan */}
                    <div className="flex-1 p-4 md:p-5 flex flex-col">
                      <h3 className="font-title-lg text-body-lg text-on-surface font-bold group-hover:text-primary transition-colors">
                        {kos.name}
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 line-clamp-1">
                        {kos.address ?? "-"}
                      </p>

                      {/* Stats mini per kos */}
                      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
                        <div>
                          <p className="text-lg font-extrabold tracking-tight text-primary">{rm.total}</p>
                          <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Kamar</p>
                        </div>
                        <div>
                          <p className="text-lg font-extrabold tracking-tight text-secondary">{bCount}</p>
                          <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Booking</p>
                        </div>
                        <div>
                          <p className="text-lg font-extrabold tracking-tight text-tertiary-container">
                            {okupansiKos.toFixed(0)}%
                          </p>
                          <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Okupansi</p>
                        </div>
                      </div>

                      {/* Aksi */}
                      <div className="flex items-center gap-2 mt-auto pt-4">
                        <Link
                          href={`/owner/kos/${kos.id}/edit`}
                          className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary-fixed rounded-lg transition-all"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </Link>
                        <Link
                          href={`/owner/kos/${kos.id}`}
                          className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary-fixed rounded-lg transition-all"
                          title="Lihat Detail"
                        >
                          <span className="material-symbols-outlined text-[20px]">visibility</span>
                        </Link>
                        <Link
                          href={`/owner/kos/${kos.id}`}
                          className="ml-auto px-3 py-1.5 bg-primary-container text-on-primary-container font-label-md rounded-lg hover:opacity-80 transition-all"
                        >
                          Kelola Kamar
                        </Link>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        )}

        {/* ── Pagination — tetap ── */}
        <div className="mt-6 px-6 py-4 bg-white rounded-xl border border-outline-variant card-shadow flex items-center justify-between">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Menampilkan 1-{kosList.length} dari {totalProperti} Properti
          </p>
          <div className="flex gap-2">
            <button
              disabled
              aria-label="Halaman sebelumnya"
              className="p-2 rounded-lg border border-outline-variant text-on-surface-variant transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button
              disabled
              aria-label="Halaman berikutnya"
              className="p-2 rounded-lg border border-outline-variant text-on-surface-variant transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </OwnerShell>
  );
}
