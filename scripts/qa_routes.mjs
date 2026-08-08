// QA Route-level: fetch tiap halaman 3 role dgn session asli (HTTP status + content markers)
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const ANON = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";
const APP = "http://localhost:3000";

async function getSession(email, pass) {
  const c = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: pass });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return data.session.access_token;
}

async function probe(path, name, token, markers) {
  const res = await fetch(APP + path, {
    headers: token ? { Cookie: `sb-fwdbfikwckhvpbmenydq-auth-token=${encodeURIComponent(JSON.stringify({ access_token: token, refresh_token: "x", expires_at: Math.floor(Date.now()/1000)+3600 }))}` } : {},
    redirect: "manual",
  });
  let body = "";
  if (res.status === 200) body = await res.text();
  const has = markers.filter(m => body.includes(m));
  const missing = markers.filter(m => !body.includes(m));
  console.log(`  ${name.padEnd(38)} → ${res.status}${res.status === 200 ? ` ${has.length}/${markers.length} markers ${missing.length ? "MISSING: " + missing.join(",") : ""}` : ""}`);
}

const siswa = await getSession("test_siswa@sle.test", "Test123456!");
const pemilik = await getSession("test_pemilik@sle.test", "Test123456!");
const admin = await getSession("test_admin@sle.test", "Test123456!");

console.log("=== SISWA ===");
await probe("/dashboard", "dashboard", siswa, ["Dashboard"]);
await probe("/favorites", "favorites", siswa, []);
await probe("/bookings", "bookings", siswa, []);
await probe("/profile", "profile", siswa, []);
await probe("/owner", "owner (harus redirect)", siswa, []);

console.log("\n=== PEMILIK ===");
await probe("/owner", "owner home", pemilik, []);
await probe("/owner/bookings", "owner bookings", pemilik, []);
await probe("/owner/kos", "owner kos", pemilik, []);
await probe("/owner/kos/new", "owner kos new", pemilik, []);
await probe("/owner/profile", "owner profile", pemilik, []);
await probe("/dashboard", "dashboard (harus redirect)", pemilik, []);

console.log("\n=== ADMIN ===");
await probe("/admin", "admin home", admin, []);
await probe("/admin/bookings", "admin bookings", admin, []);
await probe("/admin/kos", "admin kos", admin, []);
await probe("/admin/users", "admin users", admin, []);
await probe("/owner", "owner (harus redirect)", admin, []);

console.log("\n=== PUBLIC ===");
await probe("/kos", "kos list", null, []);
await probe("/kos/invalid-id-xyz", "kos invalid id", null, []);
await probe("/login", "login", null, []);
await probe("/register", "register", null, []);
await probe("/about", "about (footer?)", null, []);
await probe("/terms", "terms (footer?)", null, []);
await probe("/privacy", "privacy (footer?)", null, []);
await probe("/contact", "contact (footer?)", null, []);
await probe("/auth/callback", "auth callback (oauth)", null, []);
