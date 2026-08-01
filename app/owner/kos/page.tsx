import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import OwnerShell from "@/components/layout/OwnerShell";

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
      <section className="px-margin-mobile md:px-margin-desktop py-stack-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-gutter mb-stack-lg">
          <div className="space-y-1">
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
              Kelola Properti Anda
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Pantau performa dan ketersediaan unit kos Anda dalam satu dasbor.
            </p>
          </div>
          <Link
            href="/owner/kos/new"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-lg font-semibold hover:opacity-90 active:scale-95 transition-all shadow-md"
          >
            <span className="material-symbols-outlined text-[20px]">
              add_circle
            </span>
            <span>Tambah Kos Baru</span>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-stack-lg">
          <div className="md:col-span-1 p-stack-md bg-white rounded-xl shadow-[0_4px_20px_rgba(30,58,138,0.05)] border border-outline-variant flex flex-col justify-between h-32">
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
          <div className="md:col-span-1 p-stack-md bg-white rounded-xl shadow-[0_4px_20px_rgba(30,58,138,0.05)] border border-outline-variant flex flex-col justify-between h-32">
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
          <div className="md:col-span-1 p-stack-md bg-white rounded-xl shadow-[0_4px_20px_rgba(30,58,138,0.05)] border border-outline-variant flex flex-col justify-between h-32">
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

        {/* Property Table */}
        <div className="bg-white rounded-xl shadow-[0_4px_20px_rgba(30,58,138,0.05)] border border-outline-variant overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar" style={{ scrollbarWidth: "thin" }}>
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant">
                  <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                    Properti
                  </th>
                  <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                    Kamar
                  </th>
                  <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider">
                    Booking
                  </th>
                  <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase tracking-wider text-right">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {kosList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <span className="material-symbols-outlined text-4xl text-outline block mb-2">
                        store
                      </span>
                      <p className="text-on-surface-variant font-body-md text-body-md">
                        Belum ada properti. Klik &quot;Tambah Kos Baru&quot; untuk memulai.
                      </p>
                    </td>
                  </tr>
                ) : (
                  kosList.map((kos) => {
                    const rm = kosRoomsMap[kos.id] ?? { total: 0, available: 0 };
                    const bCount = kosBookingsMap[kos.id] ?? 0;
                    const fotoSrc = (kos as any).foto?.[0] ?? "/images/property-placeholder.jpg";
                    const isVerified = kos.verification_status === "verified";

                    return (
                      <tr
                        key={kos.id}
                        className="hover:bg-surface-container-lowest transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-variant flex-shrink-0">
                              <img
                                className="w-full h-full object-cover"
                                src={fotoSrc}
                                alt={kos.name}
                              />
                            </div>
                            <div>
                              <h4 className="font-title-lg text-body-lg text-on-surface font-semibold">
                                {kos.name}
                              </h4>
                              <p className="font-body-sm text-body-sm text-outline">
                                {kos.address ?? "-"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isVerified ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-bold gap-1">
                              <span
                                className="material-symbols-outlined text-[14px]"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                verified
                              </span>
                              Terverifikasi
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-tertiary/10 text-tertiary text-xs font-bold gap-1">
                              <span className="material-symbols-outlined text-[14px]">
                                pending
                              </span>
                              Menunggu
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-body-md text-on-surface">
                          {rm.total} Kamar
                        </td>
                        <td className="px-6 py-4 font-body-md text-on-surface">
                          {formatCompact(bCount)} Total
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/owner/kos/${kos.id}/edit`}
                              className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary-fixed rounded-lg transition-all"
                              title="Edit"
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                edit
                              </span>
                            </Link>
                            <Link
                              href={`/owner/kos/${kos.id}`}
                              className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary-fixed rounded-lg transition-all"
                              title="Lihat Detail"
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                visibility
                              </span>
                            </Link>
                            <Link
                              href={`/owner/kos/${kos.id}`}
                              className="px-3 py-1.5 bg-primary-container text-on-primary-container font-label-md rounded-lg hover:opacity-80 transition-all"
                            >
                              Kelola Kamar
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-surface-container-low flex items-center justify-between border-t border-outline-variant">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Menampilkan 1-{kosList.length} dari {totalProperti} Properti
            </p>
            <div className="flex gap-2">
              <button
                disabled
                className="p-2 rounded-lg border border-outline-variant hover:bg-white transition-colors disabled:opacity-40"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button
                disabled
                className="p-2 rounded-lg border border-outline-variant hover:bg-white transition-colors disabled:opacity-40"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </OwnerShell>
  );
}
