import { createClient } from "@supabase/supabase-js";

const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const KEY = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";

async function login(email, pass) {
  const c = createClient(URL, KEY);
  const { data: { session }, error } = await c.auth.signInWithPassword({ email, password: pass });
  return { session, error };
}
function authed(session) {
  return createClient(URL, KEY, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });
}

const { session: adm } = await login("test_admin@sle.test", "Test123456!");
if (!adm) { console.log("admin login fail"); process.exit(1); }
const admin = authed(adm);

console.log("--- favorites columns (via bogus select) ---");
const { error: e1 } = await admin.from("favorites").select("__nope__").limit(0);
console.log(e1?.message ?? "no error");

console.log("--- bookings columns (via bogus select) ---");
const { error: e2 } = await admin.from("bookings").select("__nope__").limit(0);
console.log(e2?.message ?? "no error");

console.log("\n--- OpenAPI schema ---");
const openapi = await fetch(`${URL}/rest/v1/`, {
  headers: { apikey: KEY },
});
console.log("status:", openapi.status);
const schema = await openapi.json();
const favDef = schema?.definitions?.favorites ?? schema?.components?.schemas?.favorites;
console.log("favorites def:", JSON.stringify(favDef ?? "missing", null, 2));
