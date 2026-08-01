import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";
const PROJECT_REF = "fwdbfikwckhvpbmenydq";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function toB64URL(s) { return Buffer.from(s).toString("base64url"); }

function makeCookie(session) {
  const authData = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type,
    user: session.user,
    provider_token: session.provider_token || null,
    provider_refresh_token: session.provider_refresh_token || null,
  };
  const value = "base64-" + toB64URL(JSON.stringify(authData));
  const cookieName = `sb-${PROJECT_REF}-auth-token`;
  return `${cookieName}=${encodeURIComponent(value)}; Path=/`;
}

async function getSession(email) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: "Test123456!" });
  if (error) { console.log(`SignIn error for ${email}: ${error.message}`); return null; }
  return data.session;
}

async function test(url, cookie, label) {
  const res = await fetch(url, {
    headers: { Cookie: cookie },
    redirect: "manual"
  });
  const status = res.status;
  const loc = res.headers.get("location") || "";  
  let verdict;
  let locPath = "";
  if (loc) {
    try { locPath = new URL(loc, "http://x").pathname; } catch { locPath = loc; }
  }
  if (status >= 200 && status < 300) verdict = "✅ ALLOW";
  else if (status === 307 && locPath.startsWith("/login")) verdict = "🔀→login";
  else if (status === 307 && locPath) verdict = `🔀→${locPath}`;
  else verdict = `⛔(${status})`;
  console.log(`  ${label.padEnd(35)} ${status} ${verdict}`);
}

const sessions = {};
console.log("=== Login ===\n");
for (const role of ["siswa", "pemilik", "admin"]) {
  const email = `test_${role}@sle.test`;
  sessions[role] = await getSession(email);
  console.log(`  ${role}: ${sessions[role] ? "✅" : "❌"}`);
}

console.log("\n=== Cross-Role Tests ===\n");

for (const [role, path, expect] of [
  ["siswa", "/owner", "BLOCK"],
  ["siswa", "/admin", "BLOCK"],
  ["siswa", "/dashboard", "ALLOW"],
  ["pemilik", "/admin", "BLOCK"],
  ["pemilik", "/dashboard", "BLOCK"],
  ["pemilik", "/bookings", "BLOCK"],
  ["pemilik", "/owner", "ALLOW"],
  ["admin", "/owner", "BLOCK"],
  ["admin", "/admin", "ALLOW"],
]) {
  const s = sessions[role];
  if (!s) { console.log(`  ${role}→${path}: SKIP`); continue; }
  const cookie = makeCookie(s);
  await test(`http://localhost:3000${path}`, cookie, `${role}→${path} (expect ${expect})`);
}

console.log("\n=== DONE ===");
