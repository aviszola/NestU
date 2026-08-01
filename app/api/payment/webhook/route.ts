import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifySignature } from "@/lib/midtrans";

export const runtime = "nodejs";

/**
 * Webhook Midtrans Payment Notification.
 * URL: /api/payment/webhook
 *
 * SECURITY: signature diverifikasi SHA512(order_id + status_code + gross_amount + server_key)
 * → payload palsu ditolak. Setelah verifikasi, update status booking
 * via RPC handle_midtrans_webhook (SECURITY DEFINER) — karena webhook
 * datang tanpa session login, RLS normal akan memblokir update.
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

    // 2. Mapping status Midtrans → payment_status
    let paymentStatus: string;
    if (transactionStatus === "settlement" || transactionStatus === "capture") {
      paymentStatus = transactionStatus === "capture" && fraudStatus === "challenge"
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

    // 3. Update via SECURITY DEFINER RPC — bypass RLS (webhook anon)
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("handle_midtrans_webhook", {
      p_order_id: orderId,
      p_transaction_id: transactionId,
      p_midtrans_status: transactionStatus,
      p_payment_status: paymentStatus,
    });

    if (error) {
      console.error("[payment/webhook] Gagal update booking:", JSON.stringify(error, null, 2));
      // Order tak dikenal → 400 (Midtrans stop retry)
      if (error.message?.includes("tidak ditemukan")) {
        return NextResponse.json({ error: "Order not found" }, { status: 400 });
      }
      return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    // Midtrans harapkan respon 200
    return NextResponse.json({ status: "ok" });
  } catch (e: any) {
    console.error("[payment/webhook] Error:", e.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Midtrans juga bisa kirim GET/HEAD (cek endpoint)
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
