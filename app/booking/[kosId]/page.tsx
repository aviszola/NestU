"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getKosById } from "@/lib/supabase/queries";
import { notFound, redirect, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import SubmitBookingButton from "@/components/SubmitBookingButton";
import PublicNav from "@/components/layout/PublicNav";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";

import { facilityIcon } from "@/lib/facilities";

export default function BookingPage({
  params,
}: {
  params: Promise<{ kosId: string }>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [kos, setKos] = useState<any>(null);
  const [room, setRoom] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [duration, setDuration] = useState("1");
  const [kosId, setKosId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const resolvedParams = await params;
      setKosId(resolvedParams.kosId);
    })();
  }, [params]);

  useEffect(() => {
    if (!kosId) return;
    
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace(`/login?redirect=${window.location.pathname}`); return; }
      setUser(user);

      const kosData = await getKosById(supabase, kosId);
      if (!kosData) {
        notFound();
        return;
      }
      setKos(kosData);

      const { data: allRooms } = await supabase
        .from("rooms")
        .select("id, price_per_month, room_number")
        .eq("kos_id", kosData.id)
        .eq("status", "tersedia")
        .order("price_per_month", { ascending: true })
        .limit(1);
      setRoom(allRooms?.[0]);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single();
      setProfile(profileData);
      setLoading(false);
    })();
  }, [kosId, router]);

  const price = room?.price_per_month ?? 0;
  const serviceFee = 25000;
  const adminFee = 5000;
  
  // Calculate total based on duration - LINEAR: harga bulanan × jumlah bulan
  const calculateTotal = (months: number) => {
    const monthlyTotal = price * months;
    return monthlyTotal + serviceFee + adminFee;
  };

  // Calculate breakdown for display - LINEAR (sama setiap bulan)
  const calculateBreakdown = (months: number, basePrice: number) => {
    const monthlyTotal = basePrice * months;
    return `${months} bulan × Rp ${basePrice.toLocaleString("id-ID")} = Rp ${monthlyTotal.toLocaleString("id-ID")}`;
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const total = calculateTotal(parseInt(duration));
  const monthlyPriceTotal = total - serviceFee - adminFee;
  const facilities = kos?.fasilitas || [];
  const foto = kos?.foto?.[0] || "/images/placeholder.jpg";
  const avatarUrl = profile?.avatar_url;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-outline">Memuat halaman booking...</p>
      </div>
    );
  }

  return (
    <>
      <PublicNav />

      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg min-h-[calc(100vh-160px)]">
        {/* Back Button & Page Title */}
        <div className="mb-stack-lg">
          <Link
            href={`/kos/${kos?.id || ""}`}
            className="flex items-center gap-1.5 text-outline hover:text-primary transition-colors mb-2"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider">KEMBALI KE DETAIL</span>
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight">Pengajuan Booking</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Left Side: Form & Summary */}
          <div className="lg:col-span-8 space-y-gutter">
            {/* Room Summary Card */}
            <section className="bg-white rounded-xl shadow-sm overflow-hidden border border-outline-variant">
              <div className="flex flex-col md:flex-row">
                <div className="w-full md:w-1/3 h-48 md:h-auto">
                  <Image
                    src={foto}
                    alt={kos?.name || "Kos"}
                    width={400}
                    height={300}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-stack-md flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      {kos?.verification_status === "verified" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-secondary/10 text-secondary rounded-full text-[10px] font-semibold uppercase tracking-wider mb-2">
                          <span className="material-symbols-outlined text-[13px]">verified</span> Terverifikasi
                        </span>
                      )}
                      <h2 className="text-lg font-bold text-on-surface">{kos?.name || "Kos"}</h2>
                      {room && (
                        <p className="text-sm font-normal text-on-surface-variant mt-0.5">
                          Kamar {room.room_number || "Tipe Standar"}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        Rp {price.toLocaleString("id-ID")}
                      </p>
                      <p className="text-xs font-normal text-outline">/ bulan</p>
                    </div>
                  </div>
                  {facilities.length > 0 && (
                    <div className="mt-stack-md flex flex-wrap gap-1.5">
                      {facilities.slice(0, 6).map((f: any, i: number) => (
                        <div
                          key={f.id || i}
                          className="flex items-center gap-1 px-2.5 py-1 bg-surface-container rounded-md text-on-surface-variant text-xs font-medium"
                        >
                          <span className="material-symbols-outlined text-[15px] text-primary">{facilityIcon(f)}</span>
                          {f.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Booking Form */}
            <section className="bg-white rounded-xl p-stack-md shadow-sm border border-outline-variant">
              <h3 className="text-base font-bold mb-stack-md text-on-surface tracking-tight">
                Informasi Penyewaan
              </h3>
              <div className="space-y-stack-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
                  <div className="flex flex-col gap-1">
                    <label
                      className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide"
                      htmlFor="start_date"
                    >
                      Tanggal Pindah
                    </label>
                    <div className="relative">
                      <input
                        className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:border-primary focus:ring-3 focus:ring-primary/10 outline-none transition-all font-body-md text-body-md"
                        id="start_date"
                        name="start_date"
                        type="date"
                        min={todayStr}
                        required
                      />
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                        calendar_today
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label
                      className="font-label-md text-label-md text-on-surface-variant"
                      htmlFor="duration"
                    >
                      Durasi Sewa
                    </label>
                    <select
                      className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:border-primary focus:ring-3 focus:ring-primary/10 outline-none transition-all font-body-md text-body-md bg-white"
                      id="duration"
                      name="duration"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    >
                      <option value="1">1 Bulan</option>
                      <option value="2">2 Bulan</option>
                      <option value="3">3 Bulan</option>
                      <option value="4">4 Bulan</option>
                      <option value="5">5 Bulan</option>
                      <option value="6">6 Bulan (Semester)</option>
                      <option value="12">12 Bulan (Tahun)</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label
                    className="font-label-md text-label-md text-on-surface-variant"
                    htmlFor="notes"
                  >
                    Catatan Tambahan untuk Pemilik (Opsional)
                  </label>
                  <textarea
                    className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:border-primary focus:ring-3 focus:ring-primary/10 outline-none transition-all font-body-md text-body-md resize-none"
                    id="notes"
                    name="notes"
                    placeholder="Misal: Saya akan membawa motor, apakah ada parkir khusus?"
                    rows={4}
                  />
                </div>
                <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <span className="material-symbols-outlined text-primary">info</span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Dengan mengajukan booking, Anda menyetujui{" "}
                    <a className="text-primary font-bold hover:underline" href="/terms" target="_blank" rel="noopener noreferrer">
                      Syarat &amp; Ketentuan
                    </a>{" "}
                    yang berlaku. Pemilik akan merespons pengajuan Anda dalam maksimal 24 jam.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Side: Payment Details */}
          <div className="lg:col-span-4">
            <aside className="sticky top-24 space-y-stack-md">
              <div className="bg-white rounded-xl shadow-lg border border-outline-variant p-stack-md">
                <h4 className="font-title-lg text-title-lg mb-stack-md text-on-surface">
                  Rincian Pembayaran
                </h4>
                <div className="space-y-stack-sm mb-stack-md">
                  <div className="flex justify-between font-body-md text-body-md text-on-surface-variant">
                    <span>Harga Sewa ({duration} Bulan)</span>
                    <span>Rp {monthlyPriceTotal.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="text-xs text-outline pl-2">
                    <p>Perhitungan: {calculateBreakdown(parseInt(duration), price)}</p>
                  </div>
                  <div className="flex justify-between font-body-md text-body-md text-on-surface-variant">
                    <span>Biaya Layanan</span>
                    <span>Rp {serviceFee.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between font-body-md text-body-md text-on-surface-variant">
                    <span>Biaya Admin</span>
                    <span>Rp {adminFee.toLocaleString("id-ID")}</span>
                  </div>
                  <hr className="border-outline-variant my-2" />
                  <div className="flex justify-between font-title-lg text-title-lg text-on-surface">
                    <span>Total Pembayaran</span>
                    <span className="text-primary font-bold">Rp {total.toLocaleString("id-ID")}</span>
                  </div>
                </div>
                {kos && (
                  room ? (
                    <SubmitBookingButton kosId={kos.id} roomId={room.id} />
                  ) : (
                    <div className="p-4 rounded-xl bg-error/10 border border-error/20 text-error space-y-3">
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined shrink-0 text-xl">error</span>
                        <p className="font-body-sm text-body-sm font-medium">
                          Kamar pada kos ini sudah tidak tersedia saat ini. Silakan cari kos lain atau hubungi pemilik.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Link
                          href="/kos"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-error text-white font-bold text-xs rounded-lg hover:brightness-110 transition-all"
                        >
                          <span className="material-symbols-outlined text-sm">search</span>
                          Cari Kos Lain
                        </Link>
                        {kos.whatsapp_number && (
                          <a
                            href={`https://wa.me/${kos.whatsapp_number.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 border border-error/40 text-error font-bold text-xs rounded-lg hover:bg-error/5 transition-all"
                          >
                            <span className="material-symbols-outlined text-sm">chat</span>
                            Hubungi Pemilik
                          </a>
                        )}
                      </div>
                    </div>
                  )
                )}
                <p className="text-center font-label-md text-label-md text-outline mt-3">
                  Setelah diajukan, pemilik kos akan meninjau permintaan Anda. Anda akan diminta membayar setelah booking disetujui.
                </p>
              </div>

              {/* Trust Indicators */}
              <div className="p-stack-md bg-surface-container-low rounded-xl border border-outline-variant flex items-center gap-stack-md">
                <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary">security</span>
                </div>
                <div>
                  <p className="font-label-md text-label-md text-on-surface font-bold">
                    Keamanan Terjamin
                  </p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-tight">
                    Uang Anda hanya akan diteruskan ke pemilik setelah check-in.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

            <Footer />

            <BottomNav activePage="bookings" userRole="siswa" />
    </>
  );
}
