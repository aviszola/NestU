import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncFromMidtrans } from "@/lib/supabase/transactions";

export const runtime = "nodejs";

/** POST /api/admin/transactions/sync — sync DB dari Midtrans (reconciliasi). */
export async function POST(req: NextRequest) {
  try {
    const { bookingId } = await req.json();
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId wajib" }, { status: 400 });
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

    const result = await syncFromMidtrans(supabase, bookingId);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Gagal sync Midtrans" },
      { status: 500 }
    );
  }
}