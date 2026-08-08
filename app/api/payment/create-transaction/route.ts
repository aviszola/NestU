import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSnapTransaction } from "@/lib/midtrans";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json();
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId wajib" }, { status: 400 });
    }

    // Auth check — hanya student pemilik booking
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Harus login" }, { status: 401 });
    }

    // Ambil detail booking + kos + student profile
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select(
        "*, rooms:room_id(room_number, price_per_month, kos:kos_id(id, name))"
      )
      .eq("id", bookingId)
      .maybeSingle();
    if (bErr || !booking) {
      return NextResponse.json({ error: "Booking tidak ditemukan" }, { status: 404 });
    }
    if (booking.student_id !== user.id) {
      return NextResponse.json({ error: "Bukan booking milik Anda" }, { status: 403 });
    }
    if (booking.status !== "approved") {
      return NextResponse.json(
        { error: "Booking belum disetujui — tidak bisa bayar" },
        { status: 400 }
      );
    }
    if (booking.payment_status === "lunas") {
      return NextResponse.json({ error: "Booking sudah lunas" }, { status: 400 });
    }

    // Ambil profil student (nama, email)
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, school_name")
      .eq("id", user.id)
      .maybeSingle();

    const total =
      booking.total_amount ??
      (booking.rooms?.price_per_month ?? 0) * (booking.duration_months ?? 1);

    // Anti-duplikat: kalau booking sudah punya order_id aktif & belum selesai,
    // return transaksi lama (jangan bikin order baru — Midtrans tolak duplikat)
    if (
      booking.midtrans_order_id &&
      (booking.payment_status === "menunggu_konfirmasi" || booking.payment_status === "belum_bayar")
    ) {
      // Reuse order_id lama — token lama mungkin expired, tapi order_id sama
      // dipakai ulang supaya tak ada duplikasi di Midtrans
      const orderId = booking.midtrans_order_id;
      const shortId = bookingId.replace(/-/g, "").slice(0, 8);
      const kosName = (booking.rooms?.kos?.name ?? "Kos").slice(0, 40);
      const roomNumber = (booking.rooms?.room_number ?? "").slice(0, 20);
      const customerName = (profile?.full_name ?? "Student NestU").slice(0, 20);

      const result = await createSnapTransaction({
        orderId,
        grossAmount: Math.round(total),
        customerName,
        customerEmail: user.email ?? "student@netsu.id",
        customerPhone: undefined,
        itemName: `Sewa Kos ${kosName}${roomNumber ? ` - Kamar ${roomNumber}` : ""}`.slice(0, 45),
      });
      return NextResponse.json({ token: result.token, redirect_url: result.redirect_url });
    }

    // Order ID unik: booking-{shortId}-{timestamp} — Max 50 chars (Midtrans limit)
    // UUID penuh 36 char + prefix > 50 — pakai 8 char pertama UUID
    const shortId = bookingId.replace(/-/g, "").slice(0, 8);
    const orderId = `book-${shortId}-${Date.now()}`;
    const kosName = (booking.rooms?.kos?.name ?? "Kos").slice(0, 40);
    const roomNumber = (booking.rooms?.room_number ?? "").slice(0, 20);
    const customerName = (profile?.full_name ?? "Student NestU").slice(0, 20);

    const result = await createSnapTransaction({
      orderId,
      grossAmount: Math.round(total),
      customerName,
      customerEmail: user.email ?? "student@netsu.id",
      customerPhone: undefined,
      itemName: `Sewa Kos ${kosName}${roomNumber ? ` - Kamar ${roomNumber}` : ""}`.slice(0, 45),
    });

    // Simpan order_id + payment_method = midtrans — CEK ERROR (trigger bisa blokir!)
    const { error: updErr } = await supabase
      .from("bookings")
      .update({
        payment_method: "midtrans",
        midtrans_order_id: orderId,
        midtrans_status: "pending",
      })
      .eq("id", bookingId);
    if (updErr) {
      console.error("[payment/create-transaction] Gagal simpan order_id:", JSON.stringify(updErr, null, 2));
      // Order sudah dibuat di Midtrans — jangan return error, tapi catat
      // (webhook akan gagal match kalau order_id tak tersimpan — kasih warning jelas)
      return NextResponse.json({
        token: result.token,
        redirect_url: result.redirect_url,
        warning: "Order dibuat tapi gagal tersimpan di DB — hubungi admin",
      });
    }

    return NextResponse.json({
      token: result.token,
      redirect_url: result.redirect_url,
    });
  } catch (e: any) {
    // DEBUG: log detail lengkap error Midtrans — lihat di Vercel Logs
    console.error(
      "[payment/create-transaction] ERROR DETAIL:",
      JSON.stringify(
        {
          message: e?.message,
          http_status: e?.httpStatusCode ?? e?.statusCode ?? e?.status,
          api_response: e?.ApiResponse ?? e?.apiResponse ?? e?.response?.data ?? e?.body ?? null,
          code: e?.code ?? null,
          name: e?.name ?? null,
        },
        null,
        2
      )
    );
    const msg =
      e?.message?.includes("Midtrans belum dikonfigurasi")
        ? e.message
        : `Gagal membuat transaksi: ${e?.message ?? "Unknown error"}`;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
