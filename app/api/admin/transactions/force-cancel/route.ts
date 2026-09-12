import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminOverrideBookingStatus } from "@/lib/supabase/queries";

export const runtime = "nodejs";

/** POST /api/admin/transactions/force-cancel — force cancel booking (via RPC audit). */
export async function POST(req: NextRequest) {
  try {
    const { bookingId, reason } = await req.json();
    const reasonStr = (reason ?? "").trim();
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId wajib" }, { status: 400 });
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

    await adminOverrideBookingStatus(supabase, bookingId, "cancelled", reasonStr);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Gagal force cancel" },
      { status: 500 }
    );
  }
}