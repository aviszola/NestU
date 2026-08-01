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

    // Order ID unik: booking-{bookingId}-{timestamp} — anti collision
    const orderId = `booking-${bookingId}-${Date.now()}`;
    const kosName = booking.rooms?.kos?.name ?? "Kos";
    const roomNumber = booking.rooms?.room_number ?? "";

    const result = await createSnapTransaction({
      orderId,
      grossAmount: total,
      customerName: profile?.full_name ?? "Student NetsU",
      customerEmail: user.email ?? "student@netsu.id",
      itemName: `Sewa Kos ${kosName}${roomNumber ? ` - Kamar ${roomNumber}` : ""}`,
      itemQty: booking.duration_months ?? 1,
    });

    // Simpan order_id + payment_method = midtrans
    await supabase
      .from("bookings")
      .update({
        payment_method: "midtrans",
        midtrans_order_id: orderId,
        midtrans_status: "pending",
      })
      .eq("id", bookingId);

    return NextResponse.json({
      token: result.token,
      redirect_url: result.redirect_url,
    });
  } catch (e: any) {
    console.error("[payment/create-transaction]", e);
    const msg =
      e?.message?.includes("Midtrans belum dikonfigurasi")
        ? e.message
        : "Gagal membuat transaksi pembayaran. Coba lagi.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
