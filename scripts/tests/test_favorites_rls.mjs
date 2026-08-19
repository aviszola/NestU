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
const { session: pem } = await login("test_pemilik@sle.test", "Test123456!");
const { session: adm } = await login("test_admin@sle.test", "Test123456!");
const siswa = authed(sis);
const pemilik = authed(pem);
const admin = authed(adm);

const siswaId = sis.user.id;
const pemilikId = pem.user.id;
const KOS_ID = "4dd94805-a730-4b81-8736-7fd77987d83d"; // Kost Sejahtera

async function probe(title, fn) {
  try {
    const r = await fn();
    console.log(`${title}: ${r}`);
  } catch (e) {
    console.log(`${title}: ERROR ${e.message}`);
  }
}

await probe("Siswa select fav", async () => {
  const { data, error } = await siswa.from("favorites").select("*");
  return `${data?.length ?? 0} rows ${error ? "ERR:" + error.message : ""}`;
});

await probe("Siswa INSERT fav (should fail currently)", async () => {
  const { data, error } = await siswa.from("favorites").insert({ student_id: siswaId, kos_id: KOS_ID });
  return error ? "BLOCKED: " + error.message : "INSERTED: " + JSON.stringify(data);
});

await probe("Siswa DELETE fav", async () => {
  const { error } = await siswa.from("favorites").delete().eq("student_id", siswaId).eq("kos_id", KOS_ID);
  return error ? "ERR: " + error.message : "OK";
});

await probe("Pemilik try INSERT own fav", async () => {
  const { error } = await pemilik.from("favorites").insert({ student_id: pemilikId, kos_id: KOS_ID });
  return error ? "BLOCKED: " + error.message : "INSERTED";
});
