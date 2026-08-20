import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import { formatWhatsAppNumber } from "@/lib/utils";
import { MAINT_STATUS, categoryLabel, categoryIcon } from "@/lib/maintenance";
import SafeImage from "@/components/ui/SafeImage";

export const dynamic = "force-dynamic";

function formatDate(d: string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatPrice(n: number | null | undefined): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n ?? 0);
}

interface MaintenanceReport {
  id: string;
  category: string;
  priority: string;
  description: string;
  photo_url: string | null;
  status: string;
  owner_response: string | null;
  created_at: string;
  resolved_at: string | null;
}

export default async function RentalDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ report?: string }>;
}) {
  const { bookingId } = await params;
  // Id bukan UUID → tidak mungkin booking valid → 404, bukan query DB yang error.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId)) {
    notFound();
  }
  const sp = await searchParams;
  const reportJustSent = sp.report === "success";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  // Cek kepemilikan TANPA filter aktif — bedakan "booking tidak ada"
  // (404) vs "booking milik user tapi tidak aktif lagi" (pesan jelas).
  const { data: ownBooking } = await supabase
    .from("bookings")
    .select("status, payment_status")
    .eq("id", bookingId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!ownBooking) notFound();

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "*, rooms:room_id(room_number, price_per_month, kos:kos_id(id, name, address, whatsapp_number, foto, owner_id, kos_facilities(facility_id, facility:facility_id(name, icon))))"
    )
    .eq("id", bookingId)
    .eq("student_id", user.id)
    .eq("payment_status", "lunas")
    .in("status", ["approved", "completed"])
    .maybeSingle();

  if (!booking) {
    // Booking milik user tapi tidak lolos filter aktif (lunas + approved/completed).
    // Mis. pembayaran expired / dibatalkan / masih pending → pesan jelas, bukan 404 mentah.
    const info =
      ownBooking.status === "cancelled"
        ? { icon: "cancel", title: "Booking dibatalkan", desc: "Booking ini telah dibatalkan dan tidak lagi aktif." }
        : ownBooking.payment_status === "expired"
          ? { icon: "event_busy", title: "Masa sewa telah berakhir", desc: "Masa sewa booking ini sudah berakhir. Silakan kembali ke Kamar Saya untuk melihat booking aktif." }
          : ownBooking.status === "pending"
            ? { icon: "hourglass_empty", title: "Menunggu persetujuan", desc: "Booking ini masih menunggu persetujuan pemilik kos." }
            : { icon: "event_busy", title: "Booking tidak aktif", desc: "Booking ini sudah tidak aktif saat ini." };

    return (
      <div className="min-h-screen bg-background">
        <Sidebar
          activePage="rental"
          userRole="siswa"
          userName={profile?.full_name ?? undefined}
        />
        <div className="md:pl-64 flex flex-col min-h-screen">
          <TopNav
            userRole="siswa"
            userName={profile?.full_name ?? undefined}
          />
          <main className="flex-1 px-margin-mobile md:px-margin-desktop pt-stack-lg pb-32 lg:pb-stack-lg">
            <div className="max-w-md mx-auto text-center py-16">
              <div className="mx-auto w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-stack-md">
                <span className="material-symbols-outlined text-3xl text-on-surface-variant">
                  {info.icon}
                </span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">
                {info.title}
              </h1>
              <p className="text-body-md text-on-surface-variant mb-stack-lg">
                {info.desc}
              </p>
              <Link
                href="/rental"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined !text-[18px]">arrow_back</span>
                Kembali ke Kamar Saya
              </Link>
            </div>
          </main>
          <Footer />
        </div>
        <BottomNav activePage="profile" userRole="siswa" />
      </div>
    );
  }

  const kos = booking.rooms?.kos ?? {};
  const fasilitas = (kos.kos_facilities ?? []).map((kf: { facility_id: string; facility?: { name?: string | null; icon?: string | null } | null }) => ({
    id: kf.facility_id,
    name: kf.facility?.name ?? kf.facility_id,
    icon: kf.facility?.icon ?? null,
  }));

  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", kos.owner_id)
    .maybeSingle();
  const ownerName = ownerProfile?.full_name ?? "Pemilik Kos";

  // Tanggal berakhir = move_in_date + duration_months
  let endDate: Date | null = null;
  if (booking.move_in_date) {
    const start = new Date(booking.move_in_date);
    if (!isNaN(start.getTime())) {
      const months =
        booking.duration_months && booking.duration_months > 0
          ? booking.duration_months
          : 1;
      endDate = new Date(
        start.getFullYear(),
        start.getMonth() + months,
        start.getDate()
      );
    }
  }
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const isExpired = endDate !== null && endDate < now;

  const waNumber = formatWhatsAppNumber(kos.whatsapp_number);

  // ── Riwayat laporan masalah untuk booking ini ──
  // Query opsional: kalau gagal (mis. tabel belum ada / error sementara),
  // tampilkan pesan jelas, JANGAN crash seluruh halaman (500).
  let reports: MaintenanceReport[] | null = null;
  let reportsError = false;
  try {
    const { data, error } = await supabase
      .from("maintenance_reports")
      .select("id, category, priority, description, photo_url, status, owner_response, created_at, resolved_at")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      console.error("[rental-detail] gagal memuat riwayat laporan:", error);
      reportsError = true;
    } else {
      reports = data ?? [];
    }
  } catch (err) {
    console.error("[rental-detail] gagal memuat riwayat laporan:", err);
    reportsError = true;
  }


  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        activePage="rental"
        userRole="siswa"
        userName={profile?.full_name ?? undefined}
      />

      <div className="md:pl-64 flex flex-col min-h-screen">
        <TopNav
          userRole="siswa"
          userName={profile?.full_name ?? undefined}
        />

        <main className="flex-1 px-margin-mobile md:px-margin-desktop pt-stack-lg pb-32 lg:pb-stack-lg">
          {/* Back */}
          <Link
            href="/rental"
            className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors mb-stack-md font-label-md"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            KEMBALI KE KAMAR SAYA
          </Link>

          {/* Header */}
          <div className="bg-surface-container-lowest rounded-xl card-shadow p-stack-md mb-gutter">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h1 className="font-headline-lg text-headline-lg text-primary mb-1">
                  {kos.name ?? "Kos"}
                </h1>
                <p className="text-on-surface-variant font-body-md flex items-center gap-1">
                  <span className="material-symbols-outlined !text-[16px]">location_on</span>
                  {kos.address ?? "Alamat tidak tersedia"}
                </p>
              </div>
              <span
                className={`inline-flex items-center gap-1 shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                  isExpired
                    ? "bg-surface-variant text-on-surface-variant"
                    : "bg-secondary/10 text-secondary"
                }`}
              >
                <span className="material-symbols-outlined !text-[14px]">
                  {isExpired ? "schedule" : "check_circle"}
                </span>
                {isExpired ? "Berakhir" : "Aktif"}
              </span>
            </div>
          </div>

          {/* Foto */}
          {Array.isArray(kos.foto) && kos.foto.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-gutter">
              {kos.foto.slice(0, 6).map((f: string, i: number) => (
                <div
                  key={i}
                  className="relative aspect-[4/3] rounded-xl overflow-hidden bg-surface-container-high"
                >
                  <SafeImage
                    src={f}
                    alt={`Foto ${kos.name ?? "Kos"} ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Info sewa */}
          <div className="bg-surface-container-lowest rounded-xl card-shadow p-stack-md mb-gutter">
            <h2 className="font-headline-md text-headline-md text-primary mb-stack-md">
              Detail Sewa
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-label-md text-[10px] uppercase text-outline mb-1">Nomor Kamar</p>
                <p className="font-body-md font-semibold text-on-surface">
                  {booking.rooms?.room_number ?? "-"}
                </p>
              </div>
              <div>
                <p className="font-label-md text-[10px] uppercase text-outline mb-1">Tanggal Masuk</p>
                <p className="font-body-md font-semibold text-on-surface">
                  {formatDate(booking.move_in_date)}
                </p>
              </div>
              <div>
                <p className="font-label-md text-[10px] uppercase text-outline mb-1">Durasi</p>
                <p className="font-body-md font-semibold text-on-surface">
                  {booking.duration_months || 1} bulan
                </p>
              </div>
              <div>
                <p className="font-label-md text-[10px] uppercase text-outline mb-1">Tanggal Berakhir</p>
                <p className="font-body-md font-semibold text-on-surface">
                  {endDate ? formatDate(endDate.toISOString()) : "-"}
                </p>
              </div>
              <div>
                <p className="font-label-md text-[10px] uppercase text-outline mb-1">Harga Sewa</p>
                <p className="font-body-md font-semibold text-primary">
                  {formatPrice(booking.rooms?.price_per_month)}
                  <span className="text-body-sm font-normal text-on-surface-variant"> / bulan</span>
                </p>
              </div>
              <div>
                <p className="font-label-md text-[10px] uppercase text-outline mb-1">Total Dibayar</p>
                <p className="font-body-md font-semibold text-on-surface">
                  {formatPrice(booking.total_amount)}
                </p>
              </div>
            </div>
          </div>

          {/* Fasilitas */}
          <div className="bg-surface-container-lowest rounded-xl card-shadow p-stack-md mb-gutter">
            <h2 className="font-headline-md text-headline-md text-primary mb-stack-md">
              Fasilitas
            </h2>
            {fasilitas.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {fasilitas.map((f: { id: string; name: string; icon: string | null }) => (
                  <span
                    key={f.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant text-sm font-medium"
                  >
                    {f.icon && (
                      <span className="material-symbols-outlined !text-[16px] text-primary">
                        {f.icon}
                      </span>
                    )}
                    {f.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-body-sm text-on-surface-variant">
                Belum ada fasilitas yang dicatat.
              </p>
            )}
          </div>

          {/* Kontak pemilik */}
          <div className="bg-surface-container-lowest rounded-xl card-shadow p-stack-md mb-gutter">
            <h2 className="font-headline-md text-headline-md text-primary mb-stack-md">
              Kontak Pemilik
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <span className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined">person</span>
                </span>
                <div>
                  <p className="font-body-md font-semibold text-on-surface">{ownerName}</p>
                  <p className="text-body-sm text-on-surface-variant">Pemilik {kos.name ?? "kos"}</p>
                </div>
              </div>
              {waNumber ? (
                <a
                  href={`https://wa.me/${waNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-secondary text-white rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined !text-[18px]">chat</span>
                  Hubungi via WhatsApp
                </a>
              ) : (
                <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface-container-high text-on-surface-variant rounded-xl font-bold text-sm">
                  <span className="material-symbols-outlined !text-[18px]">chat</span>
                  WhatsApp tidak tersedia
                </span>
              )}
            </div>
          </div>

          {/* Laporkan Masalah */}
          <div className="bg-surface-container-lowest rounded-xl card-shadow p-stack-md mb-gutter">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <h2 className="font-headline-md text-headline-md text-primary mb-1">
                  Ada masalah di kamar?
                </h2>
                <p className="text-body-sm text-on-surface-variant">
                  Laporkan kerusakan atau keluhan — pemilik kos akan segera menindaklanjuti.
                </p>
              </div>
              <Link
                href={`/rental/${bookingId}/report`}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all shrink-0"
              >
                <span className="material-symbols-outlined !text-[18px]">flag</span>
                Laporkan Masalah
              </Link>
            </div>
          </div>

          {/* Riwayat Laporan */}
          <div className="bg-surface-container-lowest rounded-xl card-shadow p-stack-md">
            <div className="flex items-center justify-between mb-stack-md">
              <h2 className="font-headline-md text-headline-md text-primary">
                Riwayat Laporan
              </h2>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-bold">
                <span className="material-symbols-outlined !text-[14px]">flag</span>
                {(reports ?? []).length}
              </span>
            </div>

            {reportJustSent && (
              <div className="mb-4 rounded-lg bg-secondary/10 text-secondary p-3 text-sm font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Laporan berhasil dikirim! Pemilik kos akan segera melihatnya.
              </div>
            )}

            {reportsError ? (
              <div className="rounded-2xl border-2 border-dashed border-error/30 p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-error block mb-2">error</span>
                <p className="text-body-md text-on-surface-variant">
                  Riwayat laporan tidak dapat dimuat saat ini. Silakan muat ulang halaman.
                </p>
              </div>
            ) : (reports ?? []).length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-outline-variant p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-outline block mb-2">fact_check</span>
                <p className="text-body-md text-on-surface-variant">
                  Belum ada laporan untuk kamar ini.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {(reports ?? []).map((r) => {
                  const st = MAINT_STATUS[r.status] ?? MAINT_STATUS.baru;
                  return (
                    <div
                      key={r.id}
                      className="rounded-xl border border-outline-variant bg-white p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-bold">
                          <span className="material-symbols-outlined !text-[14px]">{categoryIcon(r.category)}</span>
                          {categoryLabel(r.category)}
                        </span>
                        {r.priority === "urgent" && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-error text-white text-xs font-bold">
                            <span className="material-symbols-outlined !text-[14px]">priority_high</span>
                            Urgent
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${st.className}`}>
                          <span className="material-symbols-outlined !text-[14px]">{st.icon}</span>
                          {st.label}
                        </span>
                        <span className="ml-auto text-[11px] text-outline">
                          {new Date(r.created_at).toLocaleDateString("id-ID", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </span>
                      </div>

                      <p className="text-body-sm text-on-surface mb-2">{r.description}</p>

                      {r.photo_url && (
                        <div className="mb-2">
                          <SafeImage
                            src={r.photo_url}
                            alt="Foto laporan"
                            className="w-full sm:w-64 aspect-[4/3] object-cover rounded-lg border border-outline-variant"
                          />
                        </div>
                      )}

                      {r.owner_response && (
                        <div className="mt-2 rounded-lg bg-surface-container-low p-3 text-sm">
                          <p className="font-bold text-on-surface flex items-center gap-1 mb-0.5">
                            <span className="material-symbols-outlined !text-[14px]">reply</span>
                            Balasan pemilik
                          </p>
                          <p className="text-on-surface-variant">{r.owner_response}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>

      <BottomNav activePage="profile" userRole="siswa" />
    </div>
  );
}
