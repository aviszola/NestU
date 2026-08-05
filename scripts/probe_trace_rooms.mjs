// Kenapa UI list kosong padahal Kost BW punya 6 booking?
// Trace: kos test_pemilik → rooms → bookings, verifikasi join room_id valid.
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

const { data: myKos } = await owner.from("kos").select("id, name").eq("owner_id", "e194960c");
const kosIds = (myKos ?? []).map(k => k.id);
console.log("Kos test_pemilik (owner e194960c):", (myKos ?? []).map(k => `${k.name} ${k.id.slice(0,8)}`));

// Rooms utk semua kos test_pemilik
const { data: rooms } = await owner.from("rooms").select("id, kos_id, room_number").in("kos_id", kosIds);
console.log("\nJumlah room:", rooms?.length ?? 0);
const byKos = {};
(rooms ?? []).forEach(r => { byKos[r.kos_id] = (byKos[r.kos_id] ?? 0) + 1; });
(myKos ?? []).forEach(k => console.log(`  ${k.name}: ${byKos[k.id] ?? 0} room`));

const roomIds = (rooms ?? []).map(r => r.id);

// Booking utk room tsb (query UI)
const { data: uiBookings } = await owner
  .from("bookings")
  .select("id, room_id, status, rooms:room_id(id, room_number, kos:kos_id(name))")
  .in("room_id", roomIds)
  .order("created_at", { ascending: false });
console.log("\nBooking via UI query chain:", uiBookings?.length ?? 0);

// Bandingkan: semua booking utk room Kost BW pakai admin (RLS bypass)
const bwKos = (myKos ?? []).find(k => /bw/i.test(k.name));
const { data: bwRooms } = await admin.from("rooms").select("id, room_number, kos_id").eq("kos_id", bwKos.id);
const bwRoomIds = (bwRooms ?? []).map(r => r.id);
const { data: bwBookings } = await admin.from("bookings").select("id, room_id, status").in("room_id", bwRoomIds);
console.log(`\nRoom "Kost BW" (${bwKos.id.slice(0,8)}):`, (bwRooms ?? []).map(r => `${r.room_number} (${r.id.slice(0,8)})`));
console.log(`Booking "Kost BW" via admin: ${bwBookings?.length ?? 0}`);
(bwBookings ?? []).forEach(x => console.log(`  ${x.status} room_id=${x.room_id?.slice(0,8) ?? "NULL!"}`));

// Booking dgn room_id NULL / deleted room
const { data: orphan } = await admin.from("bookings").select("id, room_id, status, student_id").is("room_id", null).limit(10);
console.log("\nBooking dgn room_id NULL:", orphan?.length ?? 0);

// Semua room yg di-refer booking Kost BW: apakah masih ada di rooms?
const { data: allBwRoomIds } = await admin.from("bookings").select("room_id").in("room_id", bwRoomIds);
const bwRefRoomIds = [...new Set((allBwRoomIds ?? []).map(x => x.room_id))];
const missing = bwRefRoomIds.filter(rid => !bwRoomIds.includes(rid));
console.log("\nRoom Kost BW yg direfer booking tapi TIDAK ada di tabel rooms:", missing.length, missing.map(m => m?.slice(0,8)));
