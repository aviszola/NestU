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

// Try direct get ('/rest/v1/favorites?select=*') to see columns via error? Not possible.
// Instead: fetch kos with favorites joined? We only have anon/siswa keys.
// Use PostgREST options via supabase-js: select with head? No schema introspection.

// Admin sees all favorites — select with limit 0 still returns headers? Not via JS.
// Try: siswa select '*' — empty but no error. Admin too.
// Attempt inserting a fake row to learn constraints?

const { session: adm } = await login("test_admin@sle.test", "Test123456!");
const admin = authed(adm);

// PostgREST: GET /favorites?limit=1 with Prefer: return=representation — need a row.
// Alternative: use .insert() with .select() to see returned columns:
const { data, error } = await admin.from("favorites").insert({ student_id: "00000000-0000-0000-0000-000000000000", kos_id: "4dd94805-a730-4b81-8736-7fd77987d83d" }).select("*").single();
console.log("admin insert attempt:", JSON.stringify(data), error?.message ?? "");

const { data: rows, error: e2 } = await admin.from("favorites").select("student_id, kos_id, created_at").limit(5);
console.log("admin select with created_at:", e2?.message ?? JSON.stringify(rows));
