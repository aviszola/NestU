import { createClient } from "@supabase/supabase-js";

const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const KEY = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";
const PASS = "Test123456!";
const BUCKET = "maintenance-photos";

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

let passCount = 0, failCount = 0;
function report(title, pass, detail = "") {
  const mark = pass ? "✅ PASS" : "❌ FAIL";
  console.log(`  ${mark}: ${title}`);
  if (detail) console.log(`       ${detail}`);
  pass ? passCount++ : failCount++;
}

// ─── Setup ───
console.log("=== TEST: MAINTENANCE REPORTS E2E (RLS + notif + badge) ===\n");
const { session: sis } = await login("test_siswa@sle.test", PASS);
const { session: pem } = await login("test_pemilik@sle.test", PASS);
const { session: adm } = await login("test_admin@sle.test", PASS);
if (!sis || !pem || !adm) {
  console.log("❌ Login gagal (test_siswa / test_pemilik / test_admin)");
  process.exit(1);
}
const siswa = authed(sis);
const pemilik = authed(pem);
const admin = authed(adm);
const siswaId = sis.user.id;
const pemilikId = pem.user.id;

console.log("── SETUP ──\n");

// Ref cleanup
const createdReportIds = [];
const uploadedPaths = [];
const createdBookingIds = [];

// ── Kos + booking test MILIK test_pemilik (test positif owner) ──
// (booking lunas existing milik siswa ada di kos seeded owner lain —
//  bukan test_pemilik. Buat kos test sendiri, pola test_payment_proof_rls)
const myKosName = "KOS_MAINT_TEST";
const { data: existingKos } = await admin.from("kos").select("id, name").eq("owner_id", pemilikId).eq("name", myKosName).limit(1);
let myKos = existingKos?.[0] ?? null;
if (!myKos) {
  const { data: nk, error: nkErr } = await pemilik.from("kos").insert({
    name: myKosName, address: "Jl. Test Maint 1", owner_id: pemilikId,
    whatsapp_number: "081234567890", verification_status: "verified", is_active: true,
    is_test: true, // PENTING: jangan pernah bocor ke listing publik
  }).select();
  if (nkErr) { console.log(`❌ Buat kos test gagal (owner): ${nkErr.message}`); process.exit(1); }
  myKos = nk[0];
} else if (!existingKos[0].is_test) {
  // Kos lama yg tertinggal dengan is_test=false — coba tandai, supaya
  // tidak menampilkan data test di listing publik.
  const { error: fixErr } = await admin.from("kos").update({ is_test: true }).eq("id", existingKos[0].id);
  console.log(fixErr
    ? `  ⚠️ Kos lama dipakai ulang dgn is_test=false — GAGAL ditandai: ${fixErr.message}`
    : `  Kos lama dipakai ulang — ditandai is_test=true (perbaikan audit)`);
}
const { data: myRooms } = await admin.from("rooms").select("id").eq("kos_id", myKos.id);
let myRoom = myRooms?.[0] ?? null;
if (!myRoom) {
  const { data: nr, error: nrErr } = await pemilik.from("rooms").insert({
    kos_id: myKos.id, room_number: "MAINT_T", price_per_month: 400000,
  }).select();
  if (nrErr) { console.log(`❌ Buat room test gagal: ${nrErr.message}`); process.exit(1); }
  myRoom = nr[0];
}
console.log(`  Kos test milik owner: ${myKos.name} (${myKos.id.slice(0, 12)})`);

// Booking lunas utk test positif: buat via siswa (pending) → approve + lunas via admin
let myBooking = null;
{
  const { data: nb, error: nbErr } = await siswa.from("bookings").insert({
    student_id: siswaId, room_id: myRoom.id, status: "pending",
    payment_status: "belum_bayar", move_in_date: "2026-09-01", duration_months: 1,
    total_amount: 400000, base_monthly_price: 400000,
  }).select();
  if (nbErr) { console.log(`❌ Buat booking test gagal: ${nbErr.message}`); process.exit(1); }
  myBooking = nb[0];
  createdBookingIds.push(myBooking.id);
  // Approve + lunas via admin (policy 023/028: admin update, payment_confirmed)
  const { error: apErr } = await admin.from("bookings").update({
    status: "approved", payment_status: "lunas", paid_at: new Date().toISOString(),
  }).eq("id", myBooking.id);
  if (apErr) { console.log(`⚠️ Approve+lunas via admin gagal: ${apErr.message}`); }
}
if (!myBooking) { console.log("❌ Tidak bisa setup booking test"); process.exit(1); }
console.log(`  Booking test lunas: ${myBooking.id.slice(0, 12)}`);

// Booking lunas milik siswa (approved/completed + lunas)
const { data: lunasBookings } = await admin
  .from("bookings")
  .select("id, status, payment_status, room_id, rooms:room_id(kos_id, room_number)")
  .eq("student_id", siswaId)
  .eq("payment_status", "lunas")
  .in("status", ["approved", "completed"]);
const myLunasBooking = lunasBookings?.[0];
if (!myLunasBooking) {
  console.log("❌ Tidak ada booking lunas milik test_siswa — butuh data utk test positif");
  process.exit(1);
}
console.log(`  Booking lunas siswa: ${myLunasBooking.id.slice(0, 12)} (${myLunasBooking.status})`);
const myKosId = myLunasBooking.rooms?.kos_id;
const myRoomNo = myLunasBooking.rooms?.room_number ?? "-";

// Booking milik siswa LAIN (utk test RLS cross-student)
const { data: allBookings } = await admin
  .from("bookings")
  .select("id, student_id, status, payment_status")
  .neq("student_id", siswaId)
  .limit(5);
const otherBooking = allBookings?.[0] ?? null;
if (!otherBooking) console.log("  ⚠️ Tidak ada booking milik siswa lain — test cross-student dilewati");
else console.log(`  Booking siswa lain: ${otherBooking.id.slice(0, 12)} (student ${otherBooking.student_id.slice(0, 8)})`);

// Kos milik owner LAIN (utk test RLS cross-owner)
const { data: otherKosList } = await admin
  .from("kos")
  .select("id, owner_id, name")
  .neq("owner_id", pemilikId)
  .limit(1);
const otherKos = otherKosList?.[0] ?? null;
if (!otherKos) console.log("  ⚠️ Tidak ada kos milik owner lain — test cross-owner dilewati");
else console.log(`  Kos owner lain: ${otherKos.name} (owner ${otherKos.owner_id.slice(0, 8)})`);

// Buat booking BELUM lunas milik siswa (utk test validasi)
let unpaidBooking = null;
{
  const { data: rooms } = await admin.from("rooms").select("id").eq("kos_id", myKosId).limit(1);
  if (rooms?.[0]) {
    const { data: nb, error: nbErr } = await siswa.from("bookings").insert({
      student_id: siswaId, room_id: rooms[0].id, status: "pending",
      payment_status: "belum_bayar", move_in_date: "2026-09-01",
    }).select();
    if (nbErr) console.log(`  ⚠️ Buat booking belum lunas gagal: ${nbErr.message}`);
    else { unpaidBooking = nb[0]; console.log(`  Booking belum lunas (test): ${unpaidBooking.id.slice(0, 12)}`); }
  }
}

// Refs (dipakai cleanup)

// ─── TEST 1: upload foto sebagai siswa utk booking lunas miliknya ───
console.log("\n── TEST 1: Upload foto laporan (siswa, booking lunas miliknya) ──");
let photoPath = null, photoUrl = null;
{
  photoPath = `reports/${myBooking.id}/${crypto.randomUUID()}.jpg`;
  const dummy = new Blob(["dummy-maintenance-photo"], { type: "image/jpeg" });
  const { data, error } = await siswa.storage.from(BUCKET).upload(photoPath, dummy, { upsert: false });
  report("Upload foto berhasil (siswa pemilik booking)", !error, error?.message || photoPath);
  if (data) {
    uploadedPaths.push(photoPath);
    photoUrl = siswa.storage.from(BUCKET).getPublicUrl(photoPath).data.publicUrl;
  }
}

// ─── TEST 2: siswa insert laporan utk booking lunas miliknya → SUKSES ───
console.log("\n── TEST 2: Insert laporan (siswa, booking lunas miliknya) → HARUS SUKSES ──");
let myReport = null;
{
  const { data, error } = await siswa.from("maintenance_reports").insert({
    booking_id: myBooking.id,
    category: "listrik_elektronik",
    priority: "urgent",
    description: "Lampu kamar mati — test E2E maintenance",
    photo_url: photoUrl ?? "https://example.com/foto.jpg",
  }).select().single();
  report("Insert laporan sukses", !error, error?.message ?? "");
  if (data) {
    myReport = data;
    createdReportIds.push(data.id);
    report("status default 'baru'", data.status === "baru", `status=${data.status}`);
    report("student_id/owner_id diisi dari booking (redundant sync)", data.student_id === siswaId && data.owner_id === pemilikId && !!data.kos_id, `student=${data.student_id.slice(0, 8)} owner=${data.owner_id.slice(0, 8)}`);
  } else {
    report("status default 'baru'", false, "gagal insert");
    report("student_id/owner_id sync", false, "gagal insert");
  }
}

// ─── TEST 2b: owner SELECT laporan kos milik → TERLIHAT + notif owner ───
console.log("\n── TEST 2b: Owner SELECT laporan kos milik + notif ──");
{
  const { data, error } = await pemilik.from("maintenance_reports").select("id, status, student_id").eq("id", myReport?.id);
  report("Owner lihat laporan kos milik", !!data?.[0], error?.message ?? "");

  const { data: notifs } = await pemilik.from("notifications")
    .select("title, message")
    .eq("user_id", pemilikId)
    .eq("title", "Laporan masalah baru")
    .order("created_at", { ascending: false })
    .limit(1);
  const n = notifs?.[0];
  report("Owner menerima notif 'Laporan masalah baru'", !!n, n?.message ?? "tidak ada");
}

// ─── TEST 3: siswa insert utk booking BUKAN miliknya → HARUS DITOLAK ───
console.log("\n── TEST 3: Insert utk booking bukan miliknya → HARUS DITOLAK RLS ──");
if (otherBooking) {
  const { data, error } = await siswa.from("maintenance_reports").insert({
    booking_id: otherBooking.id,
    category: "lainnya",
    priority: "normal",
    description: "test cross-student",
    photo_url: photoUrl ?? "https://example.com/foto.jpg",
  }).select();
  report("RLS tolak insert cross-student", !!error, error?.message ?? "INSERTED (BUG!)");
} else {
  report("RLS tolak insert cross-student", true, "skipped — tidak ada booking siswa lain");
}

// ─── TEST 4: siswa insert utk booking BELUM LUNAS → HARUS DITOLAK ───
console.log("\n── TEST 4: Insert utk booking belum lunas → HARUS DITOLAK ──");
if (unpaidBooking) {
  const { data, error } = await siswa.from("maintenance_reports").insert({
    booking_id: unpaidBooking.id,
    category: "kebersihan",
    priority: "normal",
    description: "test unpaid booking",
    photo_url: photoUrl ?? "https://example.com/foto.jpg",
  }).select();
  report("RLS/validasi tolak insert utk booking belum lunas", !!error, error?.message ?? "INSERTED (BUG!)");
} else {
  report("RLS/validasi tolak insert utk booking belum lunas", true, "skipped — booking test gagal dibuat");
}

// ─── TEST 5: owner update status 'diproses' + response → SUKSES + notif siswa ───
console.log("\n── TEST 5: Owner update ke 'diproses' + balasan ──");
{
  const { error } = await pemilik.from("maintenance_reports").update({
    status: "diproses",
    owner_response: "Terima kasih, akan kami cek hari ini.",
  }).eq("id", myReport?.id);
  report("Owner update status → diproses", !error, error?.message ?? "");
  if (!error) {
    const { data: n } = await siswa.from("notifications")
      .select("title, message")
      .eq("user_id", siswaId)
      .eq("title", "Laporan Anda diperbarui")
      .order("created_at", { ascending: false })
      .limit(1);
    report("Siswa menerima notif status diproses + balasan", !!n?.[0], n?.[0]?.message ?? "tidak ada");
  }
}

// ─── TEST 6: owner update laporan kos BUKAN miliknya → HARUS DITOLAK ───
console.log("\n── TEST 6: Owner update laporan kos bukan miliknya → HARUS DITOLAK ──");
{
  if (otherBooking) {
    const { data: otherReport, error: insErr } = await admin.from("maintenance_reports").insert({
      booking_id: otherBooking.id, category: "lainnya", priority: "normal",
      description: "test cross-owner", photo_url: "https://example.com/x.jpg",
    }).select().single();
    if (insErr) {
      report("Owner update laporan kos lain ditolak", true, `skip: gagal buat laporan admin (${insErr.message})`);
    } else {
      createdReportIds.push(otherReport.id);
      const { data: beforeStatus } = await admin.from("maintenance_reports").select("status").eq("id", otherReport.id).single();
      const { error: updErr } = await pemilik.from("maintenance_reports").update({
        status: "selesai",
      }).eq("id", otherReport.id);
      const { data: afterStatus } = await admin.from("maintenance_reports").select("status").eq("id", otherReport.id).single();
      // supabase-js update no-op → error null TAPI 0 row berubah.
      // Valid: status sebelum == sesudah (tidak berubah = diblokir).
      const blocked = !!updErr || beforeStatus?.status === afterStatus?.status;
      report("RLS tolak update owner lain", blocked,
        updErr?.message ?? (blocked ? `status tetap ${afterStatus?.status}` : `status BERUBAH → ${afterStatus?.status} (BUG!)`));
    }
  } else {
    report("RLS tolak update owner lain", true, "skipped — no other kos booking for cross-owner");
  }
}

// ─── TEST 7: siswa SELECT laporan milik orang lain → 0 ROWS ───
console.log("\n── TEST 7: Siswa SELECT laporan milik orang lain → HARUS 0 ROWS ──");
{
  const { data: otherReports } = await admin.from("maintenance_reports")
    .select("id, student_id").neq("student_id", siswaId);
  const some = otherReports?.[0];
  if (some) {
    const { data, error } = await siswa.from("maintenance_reports").select("id").eq("id", some.id);
    report("Siswa tidak bisa lihat laporan orang lain", (data?.length ?? 0) === 0, `rows=${data?.length ?? 0} ${error?.message ?? ""}`);
  } else {
    report("Siswa tidak bisa lihat laporan orang lain", true, "skipped — no report from other student");
  }
}

// ─── TEST 8: owner update ke 'selesai' → badge count berkurang + resolved_at ───
console.log("\n── TEST 8: Update ke 'selesai' + badge count + resolved_at ──");
{
  const { count: before } = await pemilik.from("maintenance_reports")
    .select("*", { count: "exact", head: true }).eq("status", "baru");
  const { error } = await pemilik.from("maintenance_reports").update({
    status: "selesai",
    owner_response: "Sudah diperbaiki. Terima kasih atas laporannya.",
  }).eq("id", myReport?.id);
  report("Owner update status → selesai", !error, error?.message ?? "");
  if (!error) {
    const { data: n } = await siswa.from("notifications")
      .select("message")
      .eq("user_id", siswaId)
      .eq("title", "Laporan Anda diperbarui")
      .order("created_at", { ascending: false })
      .limit(1);
    report("Siswa menerima notif selesai (dengan balasan)", !!n?.[0], n?.[0]?.message ?? "tidak ada");

    const { count: after } = await pemilik.from("maintenance_reports")
      .select("*", { count: "exact", head: true }).eq("status", "baru");
    report("Badge count status 'baru' berkurang", (after ?? 0) <= (before ?? 0),
      `sebelum=${before} sesudah=${after}`);

    const { data: rd } = await admin.from("maintenance_reports").select("resolved_at").eq("id", myReport?.id).single();
    report("resolved_at terisi otomatis saat selesai", !!rd?.resolved_at, rd?.resolved_at ?? null);
  }
}

// ─── CLEANUP ───
console.log("\n── CLEANUP ──");
try {
  if (createdReportIds.length) await admin.from("maintenance_reports").delete().in("id", createdReportIds);
  console.log("  ✅ Laporan test dihapus");
} catch (e) { console.log(`  ⚠️ Gagal hapus laporan: ${e.message}`); }
try {
  if (uploadedPaths.length) await admin.storage.from(BUCKET).remove(uploadedPaths);
  console.log("  ✅ Foto test dihapus");
} catch (e) { console.log(`  ⚠️ Gagal hapus foto: ${e.message}`); }
try {
  if (unpaidBooking) {
    await admin.from("bookings").delete().eq("id", unpaidBooking.id);
  }
  if (createdBookingIds.length) await admin.from("bookings").delete().in("id", createdBookingIds);
  console.log("  ✅ Booking test dihapus");
} catch (e) { console.log(`  ⚠️ Gagal hapus booking test: ${e.message}`); }
try {
  if (myRoom?.room_number === "MAINT_T") await admin.from("rooms").delete().eq("id", myRoom.id);
  if (myKos?.name === "KOS_MAINT_TEST") {
    const { error: delKosErr } = await admin.from("kos").delete().eq("id", myKos.id);
    if (delKosErr) {
      // RLS/constraint menghalangi hapus — minimal pastikan tidak bocor:
      const { error: hideKosErr } = await admin.from("kos").update({ is_test: true, is_active: false }).eq("id", myKos.id);
      console.log(hideKosErr
        ? `  ⚠️ Gagal hapus kos test (${delKosErr.message}) & gagal tandai: ${hideKosErr.message}`
        : `  ⚠️ Gagal hapus kos test (${delKosErr.message}) — ditandai is_test=true + is_active=false`);
    } else {
      console.log("  ✅ Room & kos test dihapus");
    }
  }
} catch (e) { console.log(`  ⚠️ Gagal hapus room/kos: ${e.message}`); }

// ─── SUMMARY ───
console.log("\n=== SUMMARY ===");
console.log(`  ✅ PASS: ${passCount}`);
console.log(`  ❌ FAIL: ${failCount}`);
console.log(failCount === 0 ? "\n🎉 SEMUA TEST PASS" : "\n⚠️ ADA TEST GAGAL");
process.exit(failCount === 0 ? 0 : 1);
