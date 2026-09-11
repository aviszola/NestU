import { createClient } from "@/lib/supabase/server";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { createClient as createJSClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { formatWhatsAppNumber, extractCityFromAddress } from "@/lib/utils";
import FavoriteButton from "@/components/FavoriteButton";
import PublicNav from "@/components/layout/PublicNav";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import { facilityIcon } from "@/lib/facilities";
import { SITE_URL, SITE_NAME, LOGO_URL, OG_DEFAULT_IMAGE, truncate } from "@/lib/seo";
import type { Kos, Room } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * generateMetadata — title & OG unik per kos (pakai nama + kota/kabupaten + foto asli).
 *
 * Menggunakan @supabase/supabase-js murni (bebas cookie context) agar aman &
 * selalu mengembalikan Metadata lengkap di semua return path (sukses, !raw, catch).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  let id = "";
  try {
    const resolvedParams = await params;
    id = resolvedParams.id;
  } catch {
    id = "";
  }

  const canonicalUrl = `${SITE_URL}/kos/${id}`;
  const defaultDesc =
    "Platform pencarian kos terpercaya untuk siswa dan mahasiswa. Hunian terverifikasi, harga transparan, booking online mudah.";
  const defaultOgImages = [
    { url: OG_DEFAULT_IMAGE, width: 1200, height: 630, alt: SITE_NAME },
  ];

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createJSClient(supabaseUrl, supabaseAnonKey);

    const { data: raw } = await supabase
      .from("kos")
      .select("name, address, description, foto")
      .eq("id", id)
      .maybeSingle();

    if (!raw) {
      return {
        title: "Kos Tidak Ditemukan",
        description: defaultDesc,
        alternates: { canonical: canonicalUrl },
        openGraph: {
          title: `Kos Tidak Ditemukan | ${SITE_NAME}`,
          description: defaultDesc,
          url: canonicalUrl,
          type: "website",
          locale: "id_ID",
          siteName: SITE_NAME,
          images: defaultOgImages,
        },
        twitter: {
          card: "summary_large_image",
          title: `Kos Tidak Ditemukan | ${SITE_NAME}`,
          description: defaultDesc,
          images: [defaultOgImages[0].url],
        },
      };
    }

    const name = raw.name ?? "Kos";
    const address = raw.address ?? "";
    const foto: string[] = Array.isArray(raw.foto) ? raw.foto : [];
    const ogImage = foto[0] ?? null;

    // Title: Ekstrak Nama Kota/Kabupaten (bukan kode pos)
    const city = extractCityFromAddress(address);
    const title = truncate(`${name} — Kos di ${city}`, 58);

    // Description: 140-160 karakter
    const rawDesc = raw.description
      ? `${truncate(raw.description, 80)} — Berlokasi di ${address}.`
      : `Kos ${name} berlokasi di ${address}. Fasilitas lengkap, harga terjangkau, booking online di NestU.`;
    const description = truncate(rawDesc, 158);

    const ogImages = ogImage
      ? [{ url: ogImage, width: 1200, height: 630, alt: `Foto kos ${name}` }]
      : defaultOgImages;

    return {
      title,
      description,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        title: `${title} | ${SITE_NAME}`,
        description,
        url: canonicalUrl,
        type: "website",
        locale: "id_ID",
        siteName: SITE_NAME,
        images: ogImages,
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | ${SITE_NAME}`,
        description,
        images: ogImages.map((i) => i.url),
      },
    };
  } catch (err) {
    console.error("[generateMetadata /kos/[id]] Error:", err);
    return {
      title: "Detail Kos",
      description: defaultDesc,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        title: `Detail Kos | ${SITE_NAME}`,
        description: defaultDesc,
        url: canonicalUrl,
        type: "website",
        locale: "id_ID",
        siteName: SITE_NAME,
        images: defaultOgImages,
      },
      twitter: {
        card: "summary_large_image",
        title: `Detail Kos | ${SITE_NAME}`,
        description: defaultDesc,
        images: [defaultOgImages[0].url],
      },
    };
  }
}

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

  type KosFacilityJoin = {
    facility_id: string;
    facility: { name: string } | null;
  };

  const kos: Kos | null = raw
    ? {
        ...raw,
        fasilitas: ((raw.kos_facilities as unknown as KosFacilityJoin[]) ?? []).map((kf) => ({
          id: kf.facility_id,
          name: kf.facility?.name ?? kf.facility_id,
          icon: null,
        })),
      }
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

  const typedRooms = (allRooms as Room[] | null) ?? [];

  // Ambil booking aktif untuk semua kamar pada kos ini
  const roomIds = typedRooms.map((r) => r.id);
  let activeBookedRoomIds = new Set<string>();
  if (roomIds.length > 0) {
    const { data: rpcActive, error: rpcErr } = await supabase
      .rpc("get_active_booked_room_ids", { p_room_ids: roomIds });
    if (!rpcErr && Array.isArray(rpcActive)) {
      activeBookedRoomIds = new Set(
        (rpcActive as Array<{ room_id?: string } | string>)
          .map((row) => (typeof row === "string" ? row : (row.room_id ?? "")))
          .filter(Boolean)
      );
    } else {
      const { data: activeBookings } = await supabase
        .from("bookings")
        .select("room_id")
        .in("room_id", roomIds)
        .in("status", ["pending", "approved"]);
      if (activeBookings) {
        activeBookedRoomIds = new Set(activeBookings.map((b) => b.room_id));
      }
    }
  }

  const tersedia = typedRooms.filter(
    (r) => r.status === "tersedia" && !activeBookedRoomIds.has(r.id)
  );

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
                  <Image
                    src={url}
                    alt={`${kos.name} — foto ${i + 1}`}
                    fill
                    sizes="384px"
                    className="object-cover"
                    priority={i === 0}
                  />
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
                  {kos.fasilitas.map((f) => (
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
          Kamar ({typedRooms.length})
        </h2>

        {/* Banner: semua kamar penuh / tidak tersedia — siswa sadar langsung */}
        {typedRooms.length > 0 && tersedia.length === 0 && (
          <div className="mt-4 rounded-xl border border-error/30 bg-error/10 p-4 flex items-center gap-2 font-body-md">
            <span className="material-symbols-outlined text-xl shrink-0">bedtime</span>
            <span>
              <span className="font-semibold">Semua kamar sedang penuh.</span>{" "}
              Saat ini tidak ada kamar tersedia untuk booking dalam kos ini.
            </span>
          </div>
        )}

        {typedRooms.length === 0 ? (
          <div className="rounded-xl border border-outline-variant bg-white p-8 text-center text-outline text-sm font-normal">
            Tidak ada kamar tersedia saat ini.
          </div>
        ) : (
          <div className="space-y-3">
            {typedRooms.map((room) => {
              const hasActiveBooking = activeBookedRoomIds.has(room.id);
              const isAvailable = room.status === "tersedia" && !hasActiveBooking;

              return (
                <div
                  key={room.id}
                  className="flex items-center justify-between rounded-xl border border-outline-variant bg-white p-4 hover:border-primary/40 transition-colors"
                >
                  <div>
                    <h3 className="font-bold text-base text-on-surface flex items-center flex-wrap gap-2">
                      <span>Kamar {room.room_number}</span>
                      {isAvailable ? (
                        <span className="text-xs font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container">
                          Tersedia
                        </span>
                      ) : hasActiveBooking ? (
                        <span className="text-xs font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          Sedang Dibooking
                        </span>
                      ) : (
                        <span className="text-xs font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-surface-container-high text-outline">
                          {room.status === "terisi" ? "Terisi" : room.status === "dipesan" ? "Dipesan" : room.status}
                        </span>
                      )}
                    </h3>
                    <p className="text-sm font-semibold text-primary mt-1">
                      Rp {Number(room.price_per_month).toLocaleString("id-ID")}/bln
                      {room.size_sqm ? (
                        <span className="text-xs font-normal text-on-surface-variant"> · {room.size_sqm} m²</span>
                      ) : null}
                    </p>
                    {room.description && (
                      <p className="text-xs font-normal text-on-surface-variant mt-1 leading-relaxed">{room.description}</p>
                    )}
                  </div>
                  {isAvailable ? (
                    <Link
                      href={`/booking/${kos.id}?room=${room.id}`}
                      className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-on-primary hover:opacity-90 active:scale-95 transition-all shrink-0"
                    >
                      Ajukan Booking
                    </Link>
                  ) : hasActiveBooking ? (
                    <button
                      type="button"
                      disabled
                      className="rounded-lg bg-surface-container-high px-4 py-2.5 text-xs font-semibold text-outline cursor-not-allowed shrink-0 border border-outline-variant/60"
                      title="Kamar ini sedang memiliki proses booking aktif yang belum selesai"
                    >
                      Sedang Dibooking
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="rounded-lg bg-surface-container-high px-4 py-2.5 text-xs font-semibold text-outline cursor-not-allowed shrink-0 border border-outline-variant/60"
                    >
                      Tidak Tersedia
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── JSON-LD Structured Data (schema.org LodgingBusiness) ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LodgingBusiness",
            name: kos.name,
            description: kos.description ?? `Kos ${kos.name} di ${kos.address}`,
            url: `${SITE_URL}/kos/${kos.id}`,
            image: Array.isArray(kos.foto) && kos.foto.length > 0 ? kos.foto : undefined,
            address: {
              "@type": "PostalAddress",
              streetAddress: kos.address,
              addressCountry: "ID",
            },
            ...(kos.latitude && kos.longitude
              ? { geo: { "@type": "GeoCoordinates", latitude: kos.latitude, longitude: kos.longitude } }
              : {}),
            ...(tersedia.length > 0
              ? {
                  priceRange: `Rp ${Number(tersedia[0].price_per_month).toLocaleString("id-ID")}/bulan`,
                  offers: {
                    "@type": "Offer",
                    price: tersedia[0].price_per_month,
                    priceCurrency: "IDR",
                    availability: "https://schema.org/InStock",
                  },
                }
              : {}),
            amenityFeature: (kos.fasilitas ?? []).map((f) => ({
              "@type": "LocationFeatureSpecification",
              name: f.name,
              value: true,
            })),
            provider: {
              "@type": "Organization",
              name: SITE_NAME,
              url: SITE_URL,
              logo: LOGO_URL,
            },
          }),
        }}
      />

      <Footer />
      {isSiswa && <BottomNav activePage="search" userRole="siswa" />}
    </div>
  );
}
