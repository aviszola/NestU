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

const { session: sis } = await login("test_siswa@sle.test", "Test123456!");

// startup.sh may exist? Check favorites schema + columns
const sb = authed(sis);

const { data: cols, error: colErr } = await sb.from("favorites").select("*").limit(1);
console.log("favorites sample:", cols?.[0] ?? null, colErr?.message ?? "");

const { data: kosList } = await sb.from("kos").select("id, name").eq("is_test", false).limit(10);
console.log("\nkos available:");
for (const k of kosList ?? []) console.log(" ", k.id, k.name);
