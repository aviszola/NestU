import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatWhatsAppNumber } from "@/lib/utils";
import FavoriteButton from "@/components/FavoriteButton";
import PublicNav from "@/components/layout/PublicNav";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";

import { facilityIcon } from "@/lib/facilities";

export const dynamic = "force-dynamic";

export default async function DetailKosSiswaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: raw } = await supabase
    .from("kos")
    .select("*, kos_facilities(facility_id, facility:facility_id(name))")
    .eq("id", id)
    .single();

  const kos: any = raw
    ? { ...raw, fasilitas: (raw.kos_facilities ?? []).map((kf: any) => ({ id: kf.facility_id, name: kf.facility?.name ?? kf.facility_id })) }
    : null;
  if (!kos) notFound();

  let isSiswa = false;
  let userName = "";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user!.id)
      .single();
    isSiswa = profile?.role === "siswa";
    userName = profile?.full_name ?? "";
  }

  let isFavorited = false;
  if (isSiswa) {
    const { data: fav } = await supabase
      .from("favorites")
      .select("student_id")
      .eq("student_id", user!.id)
      .eq("kos_id", id)
      .maybeSingle();
    isFavorited = !!fav;
  }

  // Owner info
  let ownerName = "";
  if (kos.owner_id) {
    const { data: owner } = await supabase
      .from("profiles_public")
      .select("full_name")
      .eq("id", kos.owner_id)
      .single();
    ownerName = owner?.full_name ?? "";
  }

  const { data: allRooms } = await supabase
    .from("rooms")
    .select("*")
    .eq("kos_id", id)
    .order("price_per_month", { ascending: true });

  const tersedia = (allRooms ?? []).filter((r: any) => r.status === "tersedia");

  const isVerified = kos.verification_status === "verified";

  return (
    <div className="min-h-screen bg-surface">
      <PublicNav />

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 pb-32">
        {/* Breadcrumb */}
        <Link
          href="/kos"
          className="inline-flex items-center gap-1 text-sm text-outline hover:text-on-surface transition-colors mb-4"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Kembali
        </Link>

        {/* Hero */}
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-white">
          {kos.foto && kos.foto.length > 0 && (
            <div className="flex gap-2 overflow-x-auto p-2">
              {kos.foto.map((url: string, i: number) => (
                <div key={i} className="relative h-64 w-96 shrink-0 rounded-lg overflow-hidden">
                  <Image src={url} alt={`Foto ${i + 1}`} fill sizes="384px" className="object-cover" />
                </div>
              ))}
            </div>
          )}

          <div className="p-6">
            {/* Title + Actions */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight truncate">
                    {kos.name}
                  </h1>
                  {isVerified && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 bg-secondary/10 text-secondary text-[11px] font-semibold rounded-full uppercase tracking-wider">
                      <span className="material-symbols-outlined text-xs">verified</span>
                      Terverifikasi
                    </span>
                  )}
                </div>
                <p className="text-sm font-normal text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-base text-outline">location_on</span>
                  {kos.address}
                </p>
                {ownerName && (
                  <p className="text-sm font-normal text-on-surface-variant mt-1">
                    Pemilik: <span className="font-semibold text-on-surface">{ownerName}</span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <FavoriteButton
                  kosId={kos.id}
                  initialFavorited={isFavorited}
                  loggedIn={isSiswa}
                />
                {/* intentional exception: WhatsApp brand color (#25D366) for universal recognition */}
                <a
                  href={`https://wa.me/${formatWhatsAppNumber(kos.whatsapp_number)}`}
                  target="_blank"
                  className="rounded-lg bg-[#25D366] px-4 py-2 text-sm font-bold text-white hover:brightness-110 transition-all shadow-sm"
                >
                  Hubungi WA
                </a>
              </div>
            </div>

            {/* Description */}
            {kos.description && (
              <p className="mt-4 text-sm font-normal text-on-surface-variant leading-relaxed">
                {kos.description}
              </p>
            )}

            {/* Distance */}
            <div className="mt-4 flex flex-wrap gap-2 text-sm font-medium">
              {kos.distance_to_school_km !== null && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                  <span className="material-symbols-outlined text-sm align-text-bottom">school</span>
                  {" "}{kos.distance_to_school_km} km dari sekolah
                </span>
              )}
            </div>

            {/* Facilities */}
            {kos.fasilitas && kos.fasilitas.length > 0 && (
              <div className="mt-6 pt-5 border-t border-outline-variant/30">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-outline mb-3">Fasilitas</h3>
                <div className="flex flex-wrap gap-2">
                  {kos.fasilitas.map((f: any) => (
                    <span
                      key={f.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-outline-variant/60 bg-surface px-3 py-1.5 text-xs font-medium text-on-surface-variant"
                    >
                      <span className="material-symbols-outlined text-[16px] text-primary">
                        {facilityIcon(f)}
                      </span>
                      {f.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rooms */}
        <h2 className="mb-4 mt-8 text-xl font-bold text-on-surface tracking-tight">
          Kamar ({allRooms?.length ?? 0})
        </h2>

        {!allRooms || allRooms.length === 0 ? (
          <div className="rounded-xl border border-outline-variant bg-white p-8 text-center text-outline text-sm font-normal">
            Tidak ada kamar tersedia saat ini.
          </div>
        ) : (
          <div className="space-y-3">
            {allRooms.map((room: any) => (
              <div
                key={room.id}
                className="flex items-center justify-between rounded-xl border border-outline-variant bg-white p-4 hover:border-primary/40 transition-colors"
              >
                <div>
                  <h3 className="font-bold text-base text-on-surface">
                    Kamar {room.room_number}{" "}
                    <span className={`text-xs font-semibold uppercase tracking-wide ml-1.5 px-2 py-0.5 rounded-full ${
                      room.status === "tersedia" ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container-high text-outline"
                    }`}>
                      {room.status}
                    </span>
                  </h3>
                  <p className="text-sm font-semibold text-primary mt-1">
                    Rp {Number(room.price_per_month).toLocaleString("id-ID")}/bln
                    {room.size_sqm ? <span className="text-xs font-normal text-on-surface-variant"> · {room.size_sqm} m²</span> : ""}
                  </p>
                  {room.description && (
                    <p className="text-xs font-normal text-on-surface-variant mt-1 leading-relaxed">{room.description}</p>
                  )}
                </div>
                {room.status === "tersedia" && (
                  <a
                    href={`/booking/${kos.id}`}
                    className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-on-primary hover:opacity-90 active:scale-95 transition-all"
                  >
                    Booking
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
      {isSiswa && <BottomNav activePage="search" userRole="siswa" />}
    </div>
  );
}
