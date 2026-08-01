import { createClient } from "@supabase/supabase-js";

const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const KEY = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";

(async () => {
  const { data: { session: adms } } = await createClient(URL, KEY).auth.signInWithPassword({ email: "test_admin@sle.test", password: "Test123456!" });
  const admin = createClient(URL, KEY, { global: { headers: { Authorization: "Bearer " + adms.access_token } } });

  const { data: kos } = await admin.from("kos").select("id, name, owner_id").eq("name", "Kost Sejahtera").single();
  const expectedId = "511830a7-6abc-499b-802a-765f624a9b59";

  console.log("=== KONFIRMASI 1: owner_id Kost Sejahtera ===");
  console.log("owner_id:", kos?.owner_id);
  console.log("Harusnya:", expectedId);
  console.log("Match:", kos?.owner_id === expectedId ? "✅" : "❌");

  const { data: { session: pems } } = await createClient(URL, KEY).auth.signInWithPassword({ email: "test_pemilik@sle.test", password: "Test123456!" });
  const pem = createClient(URL, KEY, { global: { headers: { Authorization: "Bearer " + pems.access_token } } });
  const { data: myKos } = await pem.from("kos").select("id, name").eq("owner_id", pems.user.id);

  console.log("\n=== KONFIRMASI 2: Daftar properti test_pemilik ===");
  console.log("Jumlah kos:", myKos?.length || 0);
  myKos?.forEach(k => console.log(" -", k.name));
  if (!myKos?.find(k => k.name === "Kost Sejahtera")) {
    console.log('✅ "Kost Sejahtera" TIDAK muncul di daftar test_pemilik');
  } else {
    console.log('❌ Masih muncul!');
  }
})();
