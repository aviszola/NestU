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

// Cek trigger trg_student_payment_only ada (dari 010)
try {
  const { data, error } = await admin.rpc("is_booking_student", { path: "proof/x/y.jpg", uid: adm.user.id });
  console.log("is_booking_student rpc:", error ? `ERR: ${error.message.slice(0, 60)}` : "OK");
} catch (e) { console.log("is_booking_student threw:", e.message); }

// Coba test student update payment field — cari booking milik test_siswa dulu
const { data: bookings } = await admin.from("bookings").select("id, student_id, status").limit(10);
console.log("\nbookings sample:", bookings?.length ?? 0);
for (const b of bookings ?? []) console.log("  -", b.id.slice(0, 12), b.status, "student:", b.student_id.slice(0, 12));

// Cek function enforce_student_payment_only ada — via list functions (tak bisa via client)
// Fallback: cek trigger dengan coba update payment field sebagai siswa
const sis = await login("test_siswa@sle.test", "Test123456!");
const siswa = authed(sis);
const myBooking = bookings?.find((b) => b.student_id === sis.user.id);
if (myBooking) {
  const { error } = await siswa.from("bookings").update({
    payment_note: "probe", payment_status: "belum_bayar",
  }).eq("id", myBooking.id);
  console.log("\nstudent update payment fields:", error ? `FAIL: ${error.message.slice(0, 80)}` : "OK ✅ (010 trigger+policy jalan)");
  // revert
  await siswa.from("bookings").update({ payment_note: null }).eq("id", myBooking.id).catch(() => {});
} else {
  console.log("\ntidak ada booking untuk test_siswa — skip student update test");
}
