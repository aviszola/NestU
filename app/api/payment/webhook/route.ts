import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifySignature } from "@/lib/midtrans";

export const runtime = "nodejs";

// Shared secret webhook — dibaca dari env server-side.
// Nilai HARUS sama dengan app_config.midtrans_webhook_secret di Supabase
// (di-set via SQL Editor / setup script). Kalau beda, webhook ditolak.
const WEBHOOK_SECRET = process.env.MIDTRANS_WEBHOOK_SECRET || "";

/**
 * Webhook Midtrans Payment Notification.
 * URL: /api/payment/webhook
 *
 * SECURITY (2 layer):
 *   1. Signature SHA512 diverifikasi (payload palsu ditolak 403)
 *   2. RPC handle_midtrans_webhook_secure — hanya bisa dipanggil dengan
 *      shared secret + hanya grant ke service_role di DB.
 *      Bukan handle_midtrans_webhook lama (yang anon bisa panggil).
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

    // 1. Verifikasi signature — tolak payload palsu
    if (!verifySignature(orderId, statusCode, grossAmount, signatureKey)) {
      console.warn("[payment/webhook] Signature mismatch, ditolak:", orderId);
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    // 1b. Pastikan webhook secret terkonfigurasi
    if (!WEBHOOK_SECRET) {
      console.error("[payment/webhook] MIDTRANS_WEBHOOK_SECRET belum di-set di env!");
      return NextResponse.json({ error: "Webhook misconfigured" }, { status: 500 });
    }

    // 2. Mapping status Midtrans → payment_status
    let paymentStatus: string;
    if (transactionStatus === "settlement" || transactionStatus === "capture") {
      paymentStatus =
        transactionStatus === "capture" && fraudStatus === "challenge"
          ? "menunggu_konfirmasi"
          : "lunas";
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

    // 3. Update via SECURITY DEFINER RPC + shared secret
    //    Function hanya grant ke service_role — anon/user biasa ditolak
    //    di level DB, secret jadi lapisan kedua.
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("handle_midtrans_webhook_secure", {
      p_order_id: orderId,
      p_transaction_id: transactionId,
      p_midtrans_status: transactionStatus,
      p_payment_status: paymentStatus,
      p_webhook_secret: WEBHOOK_SECRET,
    });

    if (error) {
      console.error("[payment/webhook] Gagal update booking:", JSON.stringify(error, null, 2));
      if (error.message?.includes("tidak ditemukan")) {
        return NextResponse.json({ error: "Order not found" }, { status: 400 });
      }
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    // Midtrans harapkan respon 200
    return NextResponse.json({ status: "ok", idempotent: data === true });
  } catch (e: any) {
    console.error("[payment/webhook] Error:", e.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Midtrans juga bisa kirim GET/HEAD (cek endpoint)
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
