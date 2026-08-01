import { createClient } from "@supabase/supabase-js";

const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const KEY = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";

async function login(email, pass) {
  const c = createClient(URL, KEY);
  const { data: { session } } = await c.auth.signInWithPassword({ email, password: pass });
  return session;
}
function authed(session) {
  return createClient(URL, KEY, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });
}

const adm = await login("test_admin@sle.test", "Test123456!");
const admin = authed(adm);
const pem = await login("test_pemilik@sle.test", "Test123456!");
const pemilik = authed(pem);
const pemId = pem.user.id;

// 1. admin insert kos (kos_insert_admin)
const { data: k1, error: e1 } = await admin.from("kos").insert({
  name: "KOS_PROBE_A", address: "Jl X", owner_id: pemId,
  whatsapp_number: "0812", verification_status: "pending", is_active: true,
}).select();
console.log("admin insert kos:", e1 ? `FAIL: ${e1.message}` : `OK ${k1[0].id.slice(0, 12)}`);
if (k1) {
  const { error: d1 } = await admin.from("kos").delete().eq("id", k1[0].id);
  console.log("admin delete kos:", d1 ? `FAIL: ${d1.message}` : "OK");
}

// 2. owner insert kos (kos_insert_owner)
const { data: k2, error: e2 } = await pemilik.from("kos").insert({
  name: "KOS_PROBE_O", address: "Jl Y", owner_id: pemId,
  whatsapp_number: "0813", verification_status: "pending", is_active: true,
}).select();
console.log("owner insert kos:", e2 ? `FAIL: ${e2.message}` : `OK ${k2[0].id.slice(0, 12)}`);
if (k2) {
  const { error: d2 } = await pemilik.from("kos").delete().eq("id", k2[0].id);
  console.log("owner delete kos:", d2 ? `FAIL: ${d2.message}` : "OK");
}

// 3. cek policy list via admin rpc (kalau ada)
try {
  const { data, error } = await admin.rpc("get_policies", {}).catch(() => ({ data: null, error: { message: "no rpc" } }));
  console.log("rpc get_policies:", error?.message ?? JSON.stringify(data));
} catch (e) { console.log("rpc get_policies threw:", e.message); }
