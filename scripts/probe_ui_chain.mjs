// Reproduksi query-chain persis UI: owner bookings list (bookings page)
// + verifikasi cross-tenant isolation (tidak ada booking milik kos orang lain).
// Pakai kredensial test kalau script probe milik investigasi.
import { createClient } from "@supabase/supabase-js";

const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const KEY = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";
const PASS = "Test123456!";

async function login(email) {
  const c = createClient(URL, KEY);
  const { data: { session }, error } = await c.auth.signInWithPassword({ email, password: PASS });
  if (error) throw new Error(`${email} login gagal: ${error.message}`);
  return createClient(URL, KEY, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });
}

const owner = await login("test_pemilik@sle.test");
const admin = await login("test_admin@sle.test");

// 1) Ambil kos milik test_pemilik
const { data: myKos } = await owner.from("kos").select("id, name");
console.log("Kos milik test_pemilik:", myKos.map(k => `${k.name} (${k.id.slice(0,8)})`));

const kosIds = (myKos ?? []).map(k => k.id);
const { data: myRooms } = await owner.from("rooms").select("id, kos_id").in("kos_id", kosIds);
const roomIds = (myRooms ?? []).map(r => r.id);

// 2) Jalankan query booking persis seperti UI (loadAllBookings di bookings/page.tsx)
const { data: bookings, error: bErr } = await owner
  .from("bookings")
  .select("*, rooms:room_id(id, room_number, price_per_month, kos:kos_id(id, name))")
  .in("room_id", roomIds)
  .order("created_at", { ascending: false });

console.log("Query error (list):", bErr?.message || "none");
console.log("Jumlah booking di list owner:", bookings?.length ?? 0);
(bookings ?? []).forEach(b =>
  console.log("  -", b.status, "| kamar:", b.rooms?.room_number,
    "| kos:", b.rooms?.kos?.name, "| room_id:", b.room_id.slice(0,8))
);

// 3) Validasi cross-tenant: kos yang PEMILIK-NYA bukan test_pemilik
const { data: allKos } = await admin.from("kos").select("id, name, owner_id");
const otherKos = (allKos ?? []).filter(k =>
  // semua kos yg tidak dimiliki test_pemilik (termasuk Kost BW kalau ada)
  !kosIds.includes(k.id)
);
console.log("\nKos BUKAN milik test_pemilik:", otherKos.map(k => `${k.name} (owner ${k.owner_id.slice(0,8)}, id ${k.id.slice(0,8)})`));

// Ambil semua room milik kos lain
const otherKosIds = otherKos.map(k => k.id);
const { data: otherRooms } = await owner.from("rooms").select("id, kos_id").in("kos_id", otherKosIds);
const otherRoomIds = (otherRooms ?? []).map(r => r.id);

// Cek: apakah kos-milik-owner-lain MUNCUL di list owner (should be empty)
if (otherRoomIds.length > 0) {
  const { data: cross } = await owner
    .from("bookings")
    .select("id, status, room_id, rooms:room_id(id, room_number, kos:kos_id(name))")
    .in("room_id", otherRoomIds);
  const leaks = cross ?? [];
  console.log("\nBooking NON-OWNED muncsl di list owner:", leaks.length);
  leaks.forEach(l => console.log("  ⚠️ LEAK:", l.rooms?.kos?.name, l.rooms?.room_number, l.status));
} else {
  console.log("\nTidak ada room utk kos orang lain (bisa jadi owner benar-benar tak punya kos selain Kost Sejahtera).");
}

// 4) Cari "Kost BW" spesifik
const bw = (allKos ?? []).find(k => /bw/i.test(k.name));
if (bw) {
  console.log(`\n🟢 KETEMU "Kost BW": id=${bw.id.slice(0,8)} owner_id=${bw.owner_id.slice(0,8)} (milik test_pemilik? ${bw.owner_id === roomIds[0] ? "" : "BUKAN"})`);
  const { data: bwRooms } = await admin.from("rooms").select("id").eq("kos_id", bw.id);
  const bwRoomIds = (bwRooms ?? []).map(r => r.id);
  if (bwRoomIds.length > 0) {
    // pakai admin - RLS admin bypass, hanya utk lihat data mentah
    const { data: bwBookings } = await admin.from("bookings").select("id, student_id, status").in("room_id", bwRoomIds);
    console.log(`  Booking di "Kost BW":`, bwBookings?.length ?? 0);
    (bwBookings ?? []).forEach(x => console.log("    -", x.status, "student", x.student_id.slice(0,8)));
    // kunci: apakah test_pemilik bisa SELECT booking Kost BW ini?
    const { data: leak } = await owner.from("bookings").select("id").in("room_id", bwRoomIds);
    console.log(`  > SELECT as test_pemilik thd booking "Kost BW": ${leak?.length ?? 0} baris (0 = AMAN/isolated)`);
  }
} else {
  console.log("\n⚠️ 'Kost BW' TIDAK ditemukan di tabel kos.");
}
