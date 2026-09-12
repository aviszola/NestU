import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ALLOWED = ["belum_bayar", "menunggu_konfirmasi", "lunas", "expired"];

/** POST /api/admin/transactions/override-payment — override payment_status + audit log. */
export async function POST(req: NextRequest) {
  try {
    const { bookingId, newStatus, reason } = await req.json();
    const reasonStr = (reason ?? "").trim();
    if (!bookingId || !ALLOWED.includes(newStatus)) {
      return NextResponse.json(
        { error: "bookingId + newStatus valid wajib" },
        { status: 400 }
      );
    }
    if (reasonStr.length < 20) {
      return NextResponse.json(
        { error: "Alasan wajib minimal 20 karakter." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Harus login" }, { status: 401 });
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Hanya admin" }, { status: 403 });
    }

    // Ambil status payment / booking lama untuk audit.
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, payment_status, status, paid_at")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking) {
      return NextResponse.json({ error: "Booking tidak ditemukan" }, { status: 404 });
    }

    const { error: updErr } = await supabase
      .from("bookings")
      .update({
        payment_status: newStatus,
        paid_at:
          newStatus === "lunas" ? new Date().toISOString() : booking.paid_at,
      })
      .eq("id", bookingId);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 400 });
    }

    // Audit trail.
    const { error: logErr } = await supabase.from("admin_action_log").insert({
      admin_id: user.id,
      booking_id: bookingId,
      action_type: "payment_override",
      old_value: booking.payment_status,
      new_value: newStatus,
      reason: reasonStr,
    });
    if (logErr) {
      return NextResponse.json(
        { error: `Status berubah tapi gagal catat log: ${logErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, newStatus });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Gagal override payment" },
      { status: 500 }
    );
  }
}