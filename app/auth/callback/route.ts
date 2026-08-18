import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Route ini siap pakai begitu OAuth provider (Google/Facebook) sudah di-enable
// di Supabase Dashboard. Supabase mengarahkan user kembali ke
// {SITE_URL}/auth/callback?code=... setelah login OAuth berhasil.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // redirect param dipakai login page (?redirect=/favorites) untuk kembali ke halaman tujuan
  const next = searchParams.get("redirect") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_missing_code`);
  }

  const supabase = await createClient();

  // Tukar authorization code jadi session (set cookie via supabase-ssr)
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession gagal:", error.message);
    return NextResponse.redirect(`${origin}/login?error=auth_exchange_failed`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
