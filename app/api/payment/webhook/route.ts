import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifySignature } from "@/lib/midtrans";

export const runtime = "nodejs";

/**
 * Webhook Midtrans Payment Notification.
 * URL: /api/payment/webhook
 * Midtrans mengirim POST ke URL ini saat status transaksi berubah.
 *
 * SECURITY: signature_key diverifikasi SHA512(order_id + status_code + gross_amount + server_key)
 * — payload palsu ditolak.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const orderId = body.order_id;
    const statusCode = String(body.status_code ?? "");
    const grossAmount = String(body.gross_amount ?? "");
    const signatureKey = body.signature_key ?? "";
    const transactionStatus = body.transaction_status ?? "";
    const fraudStatus = body.fraud_status ?? "";
    const transactionId = body.transaction_id ?? "";
    const paymentType = body.payment_type ?? "";

    // 1. Verifikasi signature — tolak payload palsu
    if (!verifySignature(orderId, statusCode, grossAmount, signatureKey)) {
      console.warn("[payment/webhook] Signature mismatch, ditolak:", orderId);
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    // 2. Cari booking berdasarkan order_id (format: booking-{bookingId}-{timestamp})
    const orderParts = String(orderId).split("-");
    // order_id = booking-{uuid}-{timestamp} → uuid ada di index 1-2 (UUID punya dash!)
    // Lebih aman: cari via DB dengan prefix
    const bookingIdMatch = String(orderId).match(/^booking-([0-9a-f-]{36})-/);
    if (!bookingIdMatch) {
      console.warn("[payment/webhook] Order ID tidak dikenal:", orderId);
      return NextResponse.json({ error: "Unknown order" }, { status: 400 });
    }
    const bookingId = bookingIdMatch[1];

    const supabase = await createClient();

    // Ambil booking + pastikan order_id cocok (anti replay)
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("*, rooms:room_id(kos:kos_id(id, owner_id, name))")
      .eq("id", bookingId)
      .maybeSingle();
    if (bErr || !booking) {
      console.warn("[payment/webhook] Booking tidak ditemukan:", bookingId);
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    if (booking.midtrans_order_id !== orderId) {
      console.warn("[payment/webhook] order_id tidak cocok dengan booking:", orderId);
      return NextResponse.json({ error: "Order mismatch" }, { status: 400 });
    }

    // 3. Mapping status Midtrans → payment_status
    let paymentStatus: string;
    if (transactionStatus === "settlement" || transactionStatus === "capture") {
      // capture: cek fraud_status — sandbox accept
      if (transactionStatus === "capture" && fraudStatus === "challenge") {
        paymentStatus = "menunggu_konfirmasi";
      } else {
        paymentStatus = "lunas";
      }
    } else if (transactionStatus === "pending") {
      paymentStatus = "menunggu_konfirmasi";
    } else if (
      transactionStatus === "expire" ||
      transactionStatus === "cancel" ||
      transactionStatus === "deny"
    ) {
      paymentStatus = "expired";
    } else {
      paymentStatus = "belum_bayar";
    }

    const { error: upErr } = await supabase
      .from("bookings")
      .update({
        payment_status: paymentStatus,
        payment_method: "midtrans",
        midtrans_transaction_id: transactionId,
        midtrans_status: transactionStatus,
        paid_at: paymentStatus === "lunas" ? new Date().toISOString() : null,
      })
      .eq("id", bookingId);
    if (upErr) {
      console.error("[payment/webhook] Gagal update booking:", upErr.message);
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    // 4. Trigger notifikasi in-app (pakai RPC notify_user)
    const ownerId = booking.rooms?.kos?.owner_id;
    const kosName = booking.rooms?.kos?.name ?? "Kos";
    const studentId = booking.student_id;

    if (paymentStatus === "lunas") {
      // Ke student
      try {
        await supabase.rpc("notify_user", {
          p_user_id: studentId,
          p_title: "Pembayaran berhasil",
          p_message: `Pembayaran untuk ${kosName} telah dikonfirmasi. Siap check-in!`,
          p_link: "/bookings",
        });
      } catch {} // notifikasi opsional — jangan gagalkan webhook
      // Ke owner
      if (ownerId) {
        try {
          await supabase.rpc("notify_user", {
            p_user_id: ownerId,
            p_title: "Pembayaran diterima",
            p_message: `Pembayaran untuk ${kosName} telah lunas.`,
            p_link: "/owner/bookings",
          });
        } catch {} // notifikasi opsional
      }
    } else if (paymentStatus === "menunggu_konfirmasi") {
      try {
        await supabase.rpc("notify_user", {
          p_user_id: studentId,
          p_title: "Menunggu pembayaran",
          p_message: `Transaksi untuk ${kosName} menunggu pembayaran Anda.`,
          p_link: "/bookings",
        });
      } catch {} // notifikasi opsional
    } else if (paymentStatus === "expired") {
      try {
        await supabase.rpc("notify_user", {
          p_user_id: studentId,
          p_title: "Pembayaran kedaluwarsa",
          p_message: `Transaksi untuk ${kosName} telah kedaluwarsa. Silakan coba bayar lagi.`,
          p_link: "/bookings",
        });
      } catch {} // notifikasi opsional
    }

    // Midtrans harapkan respon 200
    return NextResponse.json({ status: "ok" });
  } catch (e: any) {
    console.error("[payment/webhook] Error:", e.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Midtrans juga bisa kirim HEAD (untuk cek endpoint)
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
