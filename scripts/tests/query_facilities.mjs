import { createClient } from "@supabase/supabase-js";

const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const KEY = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";

const admin = createClient(URL, KEY, {
  global: { headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE || ""}` } },
});

// Anon doesn't reveal everything, but facilities table is public-read in practice via kos join.
// Use anon read of facilities (public schema, RLS likely off) — try anon first.
const anon = createClient(URL, KEY);

const { data: facs, error: e1 } = await anon.from("facilities").select("id, name, icon").order("name");
console.log("=== FACILITIES TABLE ===");
if (e1) console.log("err:", e1.message);
else for (const f of facs) console.log(`${f.name}  ->  icon=${f.icon}  (${f.id})`);

const { data: kos, error: e2 } = await anon.from("kos").select("id, name").eq("is_test", false).eq("verification_status", "verified").limit(50);
console.log("\n=== KOS JOIN FACILITIES ===");
if (e2) console.log("err:", e2.message);
else
  for (const k of kos ?? []) {
    const { data: kf } = await anon
      .from("kos_facilities")
      .select("facility:facility_id(name)")
      .eq("kos_id", k.id);
    const names = (kf ?? []).map((r) => r.facility?.name).filter(Boolean);
    console.log(`${k.name}: [${names.join(", ")}]`);
  }
