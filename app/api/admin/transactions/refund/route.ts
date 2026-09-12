import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** POST /api/admin/transactions/refund — set refund_status pending/processed. */
export async function POST(req: NextRequest) {
  try {
    const { bookingId, action, reason } = await req.json();
    // action: "request" (→ pending) | "process" (→ processed)
    const target = action === "process" ? "processed" : "pending";
    const reasonStr = (reason ?? "").trim();
    if (!bookingId || !["request", "process"].includes(action)) {
      return NextResponse.json(
        { error: "bookingId + action (request|process) wajib" },
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

    const { data: booking } = await supabase
      .from("bookings")
      .select("id, refund_status")
      .eq("id", bookingId)
      .maybeSingle();
    if (!booking) {
      return NextResponse.json({ error: "Booking tidak ditemukan" }, { status: 404 });
    }

    const { error: updErr } = await supabase
      .from("bookings")
      .update({
        refund_status: target,
        refund_processed_at: target === "processed" ? new Date().toISOString() : null,
        refund_processed_by: target === "processed" ? user.id : null,
      })
      .eq("id", bookingId);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 400 });
    }

    const { error: logErr } = await supabase.from("admin_action_log").insert({
      admin_id: user.id,
      booking_id: bookingId,
      action_type: "refund",
      old_value: booking.refund_status,
      new_value: target,
      reason: reasonStr,
    });
    if (logErr) {
      return NextResponse.json(
        { error: `Status berubah tapi gagal catat log: ${logErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, refundStatus: target });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Gagal refund" },
      { status: 500 }
    );
  }
}