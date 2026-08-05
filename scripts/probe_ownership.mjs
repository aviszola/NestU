// SIAPA pemilik sebenarnya tiap kos? Hardcoded e194960c salah di probe pertama.
// Verifikasi: login test_pemilik → user.id → kos dgn owner_id = user.id
import { createClient } from "@supabase/supabase-js";

const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const KEY = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";
const PASS = "Test123456!";

const c = createClient(URL, KEY);
const { data: { user }, error } = await c.auth.signInWithPassword({ email: "test_pemilik@sle.test", password: PASS });
if (error) { console.error("login gagal:", error.message); process.exit(1); }
console.log("test_pemilik user.id:", user.id);

const owner = createClient(URL, KEY, {
  global: { headers: { Authorization: `Bearer ${user.id}` } },
});

// Owner client (session token asli)
const { data: { session } } = await c.auth.signInWithPassword({ email: "test_pemilik@sle.test", password: PASS });
const ownerAuth = createClient(URL, KEY, {
  global: { headers: { Authorization: `Bearer ${session.access_token}` } },
});

const { data: myKos } = await ownerAuth.from("kos").select("id, name, owner_id");
console.log("\nSemua kos yg bisa dibaca test_pemilik (RLS public read):");
(myKos ?? []).forEach(k => console.log(`  ${k.name} (${k.id.slice(0,8)}) owner=${k.owner_id.slice(0,8)} milik-user? ${k.owner_id === user.id ? "YA" : "TIDAK"}`));

const owned = (myKos ?? []).filter(k => k.owner_id === user.id);
console.log(`\nKos benar-benar milik test_pemilik: ${owned.length}`);
owned.forEach(k => console.log(`  ✅ ${k.name} (${k.id.slice(0,8)})`));

// Room + booking milik test_pemilik (query UI persis)
const kosIds = owned.map(k => k.id);
const { data: rooms } = await ownerAuth.from("rooms").select("id, kos_id").in("kos_id", kosIds);
const roomIds = (rooms ?? []).map(r => r.id);
const { data: bookings } = await ownerAuth
  .from("bookings")
  .select("id, room_id, status, rooms:room_id(id, room_number, kos:kos_id(name))")
  .in("room_id", roomIds)
  .order("created_at", { ascending: false });
console.log(`\nBooking yg MUNCUL di UI owner (query chain): ${bookings?.length ?? 0}`);
(bookings ?? []).forEach(b => console.log(`  - ${b.status} | ${b.rooms?.kos?.name} | ${b.rooms?.room_number}`));

// Kost BW = siapa?
const bw = (myKos ?? []).find(k => /bw/i.test(k.name));
if (bw) console.log(`\n"Kost BW" owner_id = ${bw.owner_id} — ${bw.owner_id === user.id ? "MILIK test_pemilik" : "BUKAN milik test_pemilik"}`);

// Cek profile yg punya e194960c
const { data: prof } = await ownerAuth.from("profiles_public").select("id, full_name").eq("id", "e194960c").maybeSingle();
console.log("Profile e194960c:", prof ?? "tidak ketemu/terblokir RLS");
