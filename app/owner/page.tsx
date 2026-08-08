import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import TopNav from "@/components/layout/TopNav";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";

export default async function OwnerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  // ─── Real data from Supabase ───
  const { count: totalProperties } = await supabase
    .from("kos")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", user.id);

  const { data: kosList } = await supabase
    .from("kos")
    .select("id, name, address, verification_status")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const kosIds = (kosList ?? []).map((k) => k.id);

  let totalRooms = 0;
  let totalBookings = 0;

  if (kosIds.length > 0) {
    const { count: roomCount } = await supabase
      .from("rooms")
      .select("*", { count: "exact", head: true })
      .in("kos_id", kosIds);
    totalRooms = roomCount ?? 0;

    const { data: roomIds } = await supabase
      .from("rooms")
      .select("id")
      .in("kos_id", kosIds);
    const ids = (roomIds ?? []).map((r) => r.id);

    if (ids.length > 0) {
      const { count: bookingsCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .in("room_id", ids);
      totalBookings = bookingsCount ?? 0;
    }
  }

  const occupancy =
    totalRooms > 0
      ? Math.min(100, Math.round((totalBookings / totalRooms) * 10))
      : 0;

  const statusBadge = (status: string) =>
    status === "verified"
      ? "bg-secondary/10 text-secondary"
      : "bg-tertiary/10 text-tertiary";

  const statusLabel = (status: string) =>
    status === "verified" ? "Terverifikasi" : status === "pending" ? "Menunggu" : "Ditolak";

  return (
    <>
      <TopNav
        userRole="pemilik"
        userAvatar="/images/avatar-placeholder.svg"
        showSearch
        searchPlaceholder="Cari properti..."
      />
      <div className="flex min-h-screen">
        <Sidebar activePage="dashboard" userRole="pemilik" userName={profile?.full_name || "Pemilik Kos"} />
        <main className="flex-1 lg:ml-64 px-4 md:px-8 py-6 pb-32 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-lg">home</span>
              <span className="text-base font-bold text-on-surface">
                NestU
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-on-surface mt-2">
              Kelola Properti Anda
            </h1>
            <p className="text-sm text-outline mt-1">
              Pantau dan kelola seluruh properti kos Anda dari satu dashboard
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter mb-8">
            {[
              { label: "Total Properti", value: totalProperties ?? 0, icon: "home" },
              { label: "Total Kamar", value: totalRooms, icon: "meeting_room" },
              { label: "Total Booking", value: totalBookings, icon: "receipt_long" },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-outline-variant bg-white p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-2xl text-primary">
                    {card.icon}
                  </span>
                  <div>
                    <p className="text-2xl font-bold text-on-surface">
                      {card.value}
                    </p>
                    <p className="text-xs text-outline mt-0.5">{card.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Properties Table */}
          <div className="rounded-xl border border-outline-variant bg-white overflow-hidden">
            <div className="p-5 border-b border-outline-variant">
              <h3 className="text-base font-bold text-on-surface">
                Daftar Properti
              </h3>
            </div>
            {!kosList || kosList.length === 0 ? (
              <div className="p-10 text-center text-outline text-sm">
                Belum ada properti.{" "}
                <Link
                  href="/owner/kos/new"
                  className="text-primary font-bold hover:underline"
                >
                  Tambah properti pertama
                </Link>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-container text-left text-xs font-semibold text-outline uppercase tracking-wider">
                        <th className="px-5 py-3">Properti</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {kosList.map((k) => (
                        <tr
                          key={k.id}
                          className="hover:bg-surface-container-low transition-colors"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 relative">
                                <Image
                                  src={(k as any).foto?.[0] || "/images/property-placeholder.jpg"}
                                  alt={k.name}
                                  fill
                                  unoptimized
                                  sizes="40px"
                                  className="object-cover"
                                />
                              </div>
                              <div>
                                <p className="font-medium text-on-surface">
                                  {k.name}
                                </p>
                                <p className="text-xs text-outline mt-0.5">
                                  {k.address || ""}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${statusBadge(k.verification_status)}`}
                            >
                              {statusLabel(k.verification_status)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <Link
                              href={`/owner/kos/${k.id}`}
                              className="inline-flex px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold hover:opacity-90 transition-opacity"
                            >
                              Kelola Kamar
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-5 py-4 border-t border-outline-variant">
                  <p className="text-xs text-outline">
                    Total {totalProperties} properti
                  </p>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      <Footer
        brandName="NestU"
        tagline="Academic Reliability & Community Warmth."
        showPartnerSection
      />
      <BottomNav activePage="dashboard" userRole="pemilik" />
    </>
  );
}
