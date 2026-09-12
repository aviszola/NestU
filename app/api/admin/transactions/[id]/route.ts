import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTransactionDetail } from "@/lib/supabase/transactions";

export const runtime = "nodejs";

/** GET /api/admin/transactions/[id] — detail transaksi (admin only). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const { id } = await params;
    const detail = await getTransactionDetail(supabase, id);
    if (!detail) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ detail });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Gagal ambil detail" },
      { status: 500 }
    );
  }
}