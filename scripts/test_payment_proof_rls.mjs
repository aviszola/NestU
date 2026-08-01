import { createClient } from "@supabase/supabase-js";

const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const KEY = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";
const PASS = "Test123456!";

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

// ─── Helpers ───
let passCount = 0, failCount = 0;
function report(title, pass, detail = "") {
  const mark = pass ? "✅ PASS" : "❌ FAIL";
  console.log(`  ${mark}: ${title}`);
  if (detail) console.log(`       ${detail}`);
  pass ? passCount++ : failCount++;
}

async function trySignedUrl(client, path, label) {
  try {
    const { data, error } = await client.storage
      .from("bukti-transfer")
      .createSignedUrl(path, 60);
    return { ok: !error, data, error };
  } catch (e) {
    return { ok: false, error: { message: e.message } };
  }
}

async function tryFetch(url, label) {
  try {
    const res = await fetch(url);
    if (res.ok) {
      const text = await res.text();
      return { ok: true, status: res.status, body: text.slice(0, 80) };
    }
    return { ok: false, status: res.status, body: "" };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ─── Main ───
console.log("=== TEST: PRIVATE STORAGE — BUKTI TRANSFER RLS ===\n");

// Login semua role
const sisA = await login("test_siswa@sle.test", PASS);
const pem = await login("test_pemilik@sle.test", PASS);
const adm = await login("test_admin@sle.test", PASS);
if (!sisA.session || !pem.session || !adm.session) {
  console.log("❌ Login gagal (test_siswa / test_pemilik / test_admin)");
  process.exit(1);
}
const siswaA = authed(sisA.session);
const pemilik = authed(pem.session);
const admin = authed(adm.session);
const siswaAId = sisA.session.user.id;
const pemilikId = pem.session.user.id;

// ─── Setup: cari/ buat data test ───
console.log("── SETUP ──\n");

// Owner kos seeded (511830a7, e194960c) TIDAK punya akun login.
// Solusi: buat kos baru milik test_pemilik (ee4770c0) — test-only, dibersihkan nanti.
// Note: butuh migration 010 (kos_insert_owner) supaya owner bisa insert kos.
const myKosName = "KOS_PROOF_TEST";
const { data: existingTestKos } = await admin.from("kos").select("id").eq("owner_id", pemilikId).eq("name", myKosName).limit(1);
let myKos = existingTestKos?.[0] ?? null;
if (!myKos) {
  const { data: nk, error: nkErr } = await pemilik.from("kos").insert({
    name: myKosName, address: "Jl. Test 1", owner_id: pemilikId,
    whatsapp_number: "081234567890", verification_status: "verified", is_active: true,
  }).select();
  if (nkErr) {
    console.log(`❌ Buat kos test gagal (owner): ${nkErr.message}`);
    console.log("   → Migration 010 (kos_insert_owner) belum dijalankan?");
    process.exit(1);
  }
  myKos = nk[0];
}
console.log(`  Kos test: ${myKos.name} (${myKos.id.slice(0, 12)}) milik test_pemilik`);

// Kos milik owner lain (untuk test owner B) — seeded, owner 511830a7/e194960c
const { data: otherKosList } = await admin.from("kos").select("id, name, owner_id").neq("owner_id", pemilikId);
const otherKos = otherKosList?.[0];
if (!otherKos) { console.log("⚠️ Tidak ada kos milik owner lain — owner-B test di-skip"); }
else console.log(`  Kos owner lain (referensi): ${otherKos.name} (owner ${otherKos.owner_id.slice(0, 12)})`);

// Ambil / buat room di kos pemilik
const { data: myRooms } = await admin.from("rooms").select("id, kos_id, room_number").eq("kos_id", myKos.id);
let room = myRooms?.[0];
if (!room) {
  const { data: newRoom, error } = await pemilik.from("rooms").insert({
    kos_id: myKos.id, room_number: "PROOF_T", price_per_month: 500000,
  }).select();
  if (error) { console.log(`❌ Buat room gagal: ${error.message}`); process.exit(1); }
  room = newRoom[0];
}
console.log(`  Room: ${room.room_number} (${room.id.slice(0, 12)})`);

// Ambil / buat room di kos owner lain (buat owner-B test)
let otherRoom = null;
if (otherKos) {
  const { data: oRooms } = await admin.from("rooms").select("id, kos_id").eq("kos_id", otherKos.id);
  otherRoom = oRooms?.[0];
}

// Cari booking approved milik test_siswa di room ini — atau buat baru
const { data: existingBookings } = await admin
  .from("bookings").select("id, student_id, room_id, status, payment_status")
  .eq("room_id", room.id).eq("student_id", siswaAId);
let booking = existingBookings?.find((b) => b.status === "approved") ?? null;

// Booking reference untuk owner-B: booking di kos owner lain (kalau ada)
let otherBooking = null;
if (otherRoom) {
  const { data: ob } = await admin
    .from("bookings").select("id, student_id, room_id, status")
    .eq("room_id", otherRoom.id).limit(1);
  otherBooking = ob?.[0] ?? null;
}

// Kalau belum ada approved booking → buat via siswa A (insert policy student), lalu approve via admin
if (!booking) {
  console.log("  Membuat booking test baru (pending via siswa, approve via admin)...");
  const { data: nb, error: nbErr } = await siswaA.from("bookings").insert({
    student_id: siswaAId, room_id: room.id, status: "pending",
    move_in_date: "2026-09-01", duration_months: 1, base_monthly_price: 500000,
    total_amount: 500000, payment_status: "belum_bayar",
  }).select();
  if (nbErr) { console.log(`❌ Buat booking gagal (siswa): ${nbErr.message}`); process.exit(1); }
  booking = nb[0];
  // Approve via admin (bookings_update_owner butuh owner, admin tak punya update policy — coba owner)
  const { error: apErr } = await pemilik.from("bookings").update({ status: "approved" }).eq("id", booking.id);
  if (apErr) {
    console.log(`⚠️ Approve via owner gagal: ${apErr.message}`);
    // fallback: admin update (kalau policy izinkan)
    const { error: admAp } = await admin.from("bookings").update({ status: "approved" }).eq("id", booking.id);
    if (admAp) { console.log(`❌ Approve via admin juga gagal: ${admAp.message}`); process.exit(1); }
  }
}
console.log(`  Booking target: ${booking.id.slice(0, 12)} (${booking.status})`);

// Upload dummy file sebagai "bukti transfer" — sebagai SISWA A (harusnya berhasil)
const proofPath = `proof/${booking.id}/${crypto.randomUUID()}.jpg`;
const dummy = new Blob(["dummy-proof-content"], { type: "image/jpeg" });
const { error: upErr } = await siswaA.storage.from("bukti-transfer").upload(proofPath, dummy, { upsert: false });
if (upErr) {
  console.log(`❌ Upload sebagai siswa A GAGAL (precondition): ${upErr.message}`);
} else {
  console.log(`  ✅ Upload siswa A berhasil: ${proofPath.slice(0, 60)}...`);
  // Update payment_proof_path via siswa A (test policy 010)
  const { error: updErr } = await siswaA.from("bookings").update({
    payment_status: "menunggu_konfirmasi", payment_proof_path: proofPath, payment_note: "dummy",
  }).eq("id", booking.id);
  if (updErr) {
    console.log(`  ⚠️ Update payment_proof_path siswa A GAGAL: ${updErr.message}`);
    // Fallback: via admin
    const { error: admUpd } = await admin.from("bookings").update({
      payment_status: "menunggu_konfirmasi", payment_proof_path: proofPath,
    }).eq("id", booking.id);
    if (admUpd) { console.log(`❌ Fallback admin update juga gagal: ${admUpd.message}`); process.exit(1); }
    console.log("  (di-set via admin fallback)");
  }
}

// Cek path tersimpan
const { data: afterUpd } = await admin.from("bookings").select("payment_proof_path, payment_status").eq("id", booking.id).single();
console.log(`  Path di DB: ${afterUpd?.payment_proof_path ?? "null"}`);
console.log("");

// ─── TEST 1: Upload sebagai student A (pemilik booking) ───
console.log("── TEST 1: Upload sebagai student A (pemilik booking) ──");
report("Upload ke path proof/{bookingId}/{uuid}.jpg", !upErr, upErr?.message || `path: ${proofPath.slice(0, 60)}`);
report("payment_proof_path terisi format benar", !!afterUpd?.payment_proof_path?.startsWith(`proof/${booking.id}/`), afterUpd?.payment_proof_path ?? "null");
console.log("");

// ─── TEST 2: Akses oleh student B (bukan pemilik booking) — HARUS GAGAL ───
console.log("── TEST 2: Akses oleh student B (bukan pemilik) → HARUS GAGAL ──");
let siswaB = null;
// Cek apakah ada user siswa lain; kalau tidak, register satu (via admin tak bisa — gunakan signUp)
const { data: allProfiles } = await admin.from("profiles").select("id, role").limit(50);
const otherSiswa = allProfiles?.find((p) => p.role === "siswa" && p.id !== siswaAId);
if (otherSiswa) {
  console.log(`  Student B ditemukan: ${otherSiswa.id.slice(0, 12)}`);
  // Login student B — coba via email; kalau tidak bisa, signUp akun baru
  const sisB = await login("test_siswa_2@sle.test", PASS);
  if (sisB.session) {
    siswaB = authed(sisB.session);
  } else {
    const { data: su, error: suErr } = await siswaA.auth.signUp({ email: "test_siswa_2@sle.test", password: PASS });
    if (suErr || !su.user) console.log(`  ⚠️ Tidak bisa buat student B: ${suErr?.message ?? "no user"}`);
    else {
      const sisB2 = await login("test_siswa_2@sle.test", PASS);
      if (sisB2.session) {
        siswaB = authed(sisB2.session);
        // Set role siswa via admin
        await admin.from("profiles").upsert({ id: su.user.id, role: "siswa", full_name: "Test Siswa B" });
      }
    }
  }
} else {
  console.log("  Tidak ada siswa lain — buat via signUp");
  const { data: su, error: suErr } = await siswaA.auth.signUp({ email: "test_siswa_2@sle.test", password: PASS });
  if (!suErr && su.user) {
    await admin.from("profiles").upsert({ id: su.user.id, role: "siswa", full_name: "Test Siswa B" });
    const sisB2 = await login("test_siswa_2@sle.test", PASS);
    if (sisB2.session) siswaB = authed(sisB2.session);
  }
}
if (siswaB) {
  const { ok, error, data } = await trySignedUrl(siswaB, proofPath, "student B");
  const signedOk = ok && data?.signedUrl;
  let fetchBlocked = false;
  if (signedOk) {
    const f = await tryFetch(data.signedUrl, "student B fetch");
    fetchBlocked = !f.ok;
    report("Student B createSignedUrl ditolak / fetch gagal", !signedOk || fetchBlocked,
      signedOk ? `signedUrl didapat tapi fetch status ${f.status}` : `createSignedUrl error: ${error?.message}`);
  } else {
    report("Student B createSignedUrl ditolak / fetch gagal", true, `error: ${error?.message}`);
  }
} else {
  report("Student B createSignedUrl ditolak", false, "tidak bisa login/buat student B");
}
console.log("");

// ─── TEST 3: Akses oleh owner kos terkait — HARUS BERHASIL ───
console.log("── TEST 3: Akses oleh owner kos terkait → HARUS BERHASIL ──");
{
  const { ok, error, data } = await trySignedUrl(pemilik, proofPath, "owner");
  let fetchOk = false;
  if (ok && data?.signedUrl) {
    const f = await tryFetch(data.signedUrl, "owner fetch");
    fetchOk = f.ok;
    report("Owner kos createSignedUrl + fetch berhasil", fetchOk,
      fetchOk ? `status ${f.status}, body: ${f.body}` : `fetch status ${f.status}`);
  } else {
    report("Owner kos createSignedUrl + fetch berhasil", false, `error: ${error?.message}`);
  }
}
console.log("");

// ─── TEST 4: Akses oleh admin — HARUS BERHASIL ───
console.log("── TEST 4: Akses oleh admin → HARUS BERHASIL ──");
{
  const { ok, error, data } = await trySignedUrl(admin, proofPath, "admin");
  let fetchOk = false;
  if (ok && data?.signedUrl) {
    const f = await tryFetch(data.signedUrl, "admin fetch");
    fetchOk = f.ok;
    report("Admin createSignedUrl + fetch berhasil", fetchOk,
      fetchOk ? `status ${f.status}, body: ${f.body}` : `fetch status ${f.status}`);
  } else {
    report("Admin createSignedUrl + fetch berhasil", false, `error: ${error?.message}`);
  }
}
console.log("");

// ─── TEST 5: Akses oleh owner LAIN (kos tidak terkait) — HARUS GAGAL ───
console.log("── TEST 5: Akses oleh owner lain (kos tidak terkait) → HARUS GAGAL ──");
if (otherKos) {
  // Coba login sebagai owner B; kalau belum ada, buat akun baru via signUp + set role
  let pemB = await login("test_pemilik_2@sle.test", PASS);
  if (!pemB.session) {
    console.log("  test_pemilik_2 belum ada — buat akun baru...");
    const { data: su, error: suErr } = await siswaA.auth.signUp({ email: "test_pemilik_2@sle.test", password: PASS });
    if (suErr || !su.user) {
      report("Owner lain createSignedUrl ditolak", false, `signUp gagal: ${suErr?.message ?? "no user"}`);
    } else {
      // Set role pemilik + kos miliknya (agar bukan owner kos target)
      await admin.from("profiles").upsert({ id: su.user.id, role: "pemilik", full_name: "Test Pemilik B" });
      pemB = await login("test_pemilik_2@sle.test", PASS);
    }
  }
  if (pemB.session) {
    const pemilikB = authed(pemB.session);
    const { ok, error, data } = await trySignedUrl(pemilikB, proofPath, "owner B");
    let fetchBlocked = false;
    if (ok && data?.signedUrl) {
      const f = await tryFetch(data.signedUrl, "owner B fetch");
      fetchBlocked = !f.ok;
      report("Owner lain createSignedUrl ditolak / fetch gagal", !ok || fetchBlocked,
        fetchBlocked ? `signedUrl didapat tapi fetch status ${f.status}` : `error: ${error?.message}`);
    } else {
      report("Owner lain createSignedUrl ditolak / fetch gagal", true, `error: ${error?.message}`);
    }
  } else {
    report("Owner lain createSignedUrl ditolak", false, "tidak bisa login/buat test_pemilik_2");
  }
} else {
  report("Owner lain createSignedUrl ditolak", false, "tidak ada kos milik owner lain");
}
console.log("");

// ─── CLEANUP: hapus data dummy ───
console.log("── CLEANUP ──");
try {
  await admin.storage.from("bukti-transfer").remove([proofPath]);
  console.log("  ✅ File dummy dihapus");
} catch (e) { console.log(`  ⚠️ Gagal hapus file: ${e.message}`); }
try {
  await admin.from("bookings").delete().eq("id", booking.id).eq("payment_note", "dummy");
  console.log("  ✅ Booking dummy dihapus");
} catch (e) { console.log(`  ⚠️ Gagal hapus booking: ${e.message}`); }
try {
  if (room && room.room_number === "PROOF_T") await admin.from("rooms").delete().eq("id", room.id);
  if (myKos && myKos.name === "KOS_PROOF_TEST") await admin.from("kos").delete().eq("id", myKos.id);
  console.log("  ✅ Room & kos test dihapus");
} catch (e) { console.log(`  ⚠️ Gagal hapus room/kos: ${e.message}`); }
console.log("");

// ─── SUMMARY ───
console.log("=== SUMMARY ===");
console.log(`  ✅ PASS: ${passCount}`);
console.log(`  ❌ FAIL: ${failCount}`);
console.log(failCount === 0 ? "\n🎉 SEMUA TEST PASS" : "\n⚠️ ADA TEST GAGAL");
process.exit(failCount === 0 ? 0 : 1);
