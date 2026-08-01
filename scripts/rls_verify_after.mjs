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

async function test(title, fn) {
  try {
    const result = await fn();
    const status = result.pass ? "✅ PASS" : "❌ FAIL";
    console.log(`  ${status}: ${title}`);
    if (result.detail) console.log(`    ${result.detail}`);
    return result;
  } catch (e) {
    console.log(`  ❌ ERROR: ${title} — ${e.message}`);
    return { pass: false, detail: e.message };
  }
}

async function main() {
  console.log("=== RLS VERIFICATION AFTER POLICY FIX ===\n");

  // Login all roles
  const { session: sisSession } = await login("test_siswa@sle.test", "Test123456!");
  const { session: pemSession } = await login("test_pemilik@sle.test", "Test123456!");
  const { session: admSession } = await login("test_admin@sle.test", "Test123456!");
  const anon = createClient(URL, KEY);
  const siswa = sisSession ? authed(sisSession) : null;
  const pemilik = pemSession ? authed(pemSession) : null;
  const admin = admSession ? authed(admSession) : null;

  if (!admin) { console.log("❌ Admin login failed, aborting"); return; }

  console.log(`Siswa login: ${sisSession ? "OK" : "FAIL"}`);
  console.log(`Pemilik login: ${pemSession ? "OK" : "FAIL"}`);
  console.log(`Admin login: ${admSession ? "OK" : "FAIL"}\n`);

  // Get reference data via admin
  const { data: allProfiles } = await admin.from("profiles").select("id, role, full_name");
  const { data: allKos } = await admin.from("kos").select("id, name, owner_id");
  const { data: allBookings } = await admin.from("bookings").select("id, student_id, room_id, status");
  const { data: allRooms } = await admin.from("rooms").select("id, kos_id");
  const { data: allFavorites } = await admin.from("favorites").select("id, student_id, kos_id");

  const pemilikId = pemSession?.user?.id;
  const siswaId = sisSession?.user?.id;

  // Create room->kos lookup
  const roomKosMap = {};
  if (allRooms) for (const r of allRooms) roomKosMap[r.id] = r.kos_id;

  // Create kos->owner lookup
  const kosOwnerMap = {};
  if (allKos) for (const k of allKos) kosOwnerMap[k.id] = k.owner_id;

  // ============================================================
  console.log("1. PROFILES — Self vs Others Access");
  // ============================================================

  // 1a. Siswa reads own profile (should succeed)
  await test("Siswa reads own profile", async () => {
    if (!siswa) return { pass: false, detail: "Not logged in" };
    const { data, error } = await siswa.from("profiles").select("id, role, full_name").eq("id", siswaId).maybeSingle();
    return { pass: !error && data?.id === siswaId, detail: error?.message || `Got profile for ${data?.id?.slice(0,12)}` };
  });

  // 1b. Siswa reads ANOTHER user's profile (should fail)
  await test("Siswa reads OTHER user's profile = BLOCKED", async () => {
    if (!siswa || !allProfiles) return { pass: false, detail: "Missing data" };
    const other = allProfiles.find(p => p.id !== siswaId);
    if (!other) return { pass: false, detail: "No other profile found" };
    const { data, error } = await siswa.from("profiles").select("id, role, full_name").eq("id", other.id).maybeSingle();
    // RLS returns empty array/null, not an error
    return { pass: !data, detail: data ? `Got profile for ${other.id.slice(0,12)} (should be blocked)` : "Correctly blocked" };
  });

  // 1c. Pemilik reads own profile
  await test("Pemilik reads own profile", async () => {
    if (!pemilik) return { pass: false, detail: "Not logged in" };
    const { data } = await pemilik.from("profiles").select("id, role, full_name").eq("id", pemilikId).maybeSingle();
    return { pass: !!data, detail: data ? `Got profile for ${data.id?.slice(0,12)}` : "No data returned" };
  });

  // 1d. Pemilik reads another user (should fail)
  await test("Pemilik reads OTHER user's profile = BLOCKED", async () => {
    if (!pemilik || !allProfiles) return { pass: false, detail: "Missing data" };
    const other = allProfiles.find(p => p.id !== pemilikId);
    if (!other) return { pass: false, detail: "No other profile found" };
    const { data } = await pemilik.from("profiles").select("id, role, full_name").eq("id", other.id).maybeSingle();
    return { pass: !data, detail: data ? `Got profile for ${other.id.slice(0,12)}` : "Correctly blocked" };
  });

  // 1e. Admin reads all profiles
  await test("Admin reads ALL profiles", async () => {
    if (!admin) return { pass: false, detail: "Not logged in" };
    const { data } = await admin.from("profiles").select("id").limit(100);
    return { pass: (data?.length || 0) >= 3, detail: `${data?.length || 0} profiles accessible` };
  });

  // 1f. Anon reads profiles (should fail)
  await test("Anon reads any profile = BLOCKED", async () => {
    const { data } = await anon.from("profiles").select("id").limit(1);
    return { pass: !data || data.length === 0, detail: data?.length > 0 ? `Got ${data.length} profiles` : "Correctly blocked" };
  });

  // ============================================================
  console.log("\n2. PROFILES_PUBLIC — Public View for Owner Names");
  // ============================================================

  await test("Anon can read profiles_public (owner names)", async () => {
    const { data, error } = await anon.from("profiles_public").select("id, full_name").limit(5);
    return { pass: !error && (data?.length || 0) > 0, detail: `${data?.length || 0} profiles, error: ${error?.message || 'none'}` };
  });

  await test("profiles_public exposes only id, full_name, avatar_url", async () => {
    const { data } = await admin.from("profiles_public").select("*").limit(1);
    if (!data || data.length === 0) return { pass: false, detail: "No data" };
    const cols = Object.keys(data[0]).sort().join(",");
    const expected = ["avatar_url","full_name","id"].sort().join(",");
    return { pass: cols === expected, detail: `Columns: ${cols}` };
  });

  // ============================================================
  console.log("\n3. BOOKINGS — Role-based Access");
  // ============================================================

  // 3a. Siswa reads own bookings
  const siswaBookingIds = allBookings?.filter(b => b.student_id === siswaId).map(b => b.id) || [];
  await test("Siswa reads own bookings (RLS check)", async () => {
    if (!siswa) return { pass: false, detail: "Not logged in" };
    const { data } = await siswa.from("bookings").select("id, student_id");
    const own = data?.filter(b => b.student_id === siswaId) || [];
    const other = data?.filter(b => b.student_id !== siswaId) || [];
    // RLS check: no other student's booking visible
    return { pass: other.length === 0, detail: `${data?.length || 0} total, ${own.length} own, ${other.length} other (RLS check: other must be 0)` };
  });

  // 3b. Siswa reads OTHER student's booking (by ID) — should fail
  if (allBookings) {
    const otherBooking = allBookings.find(b => b.student_id !== siswaId);
    if (otherBooking) {
      await test("Siswa reads OTHER student's booking = BLOCKED", async () => {
        if (!siswa) return { pass: false, detail: "Not logged in" };
        const { data } = await siswa.from("bookings").select("id").eq("id", otherBooking.id).maybeSingle();
        return { pass: !data, detail: data ? `Got booking ${otherBooking.id.slice(0,12)} (should be blocked)` : "Correctly blocked" };
      });
    }
  }

  // 3c. Pemilik reads bookings for their kos
  const pemilikKosIds = allKos?.filter(k => k.owner_id === pemilikId).map(k => k.id) || [];
  const pemilikRoomIds = allRooms?.filter(r => pemilikKosIds.includes(r.kos_id)).map(r => r.id) || [];
  const pemilikBookingCount = allBookings?.filter(b => pemilikRoomIds.includes(b.room_id)).length || 0;

  await test("Pemilik reads bookings for their kos", async () => {
    if (!pemilik) return { pass: false, detail: "Not logged in" };
    const { data } = await pemilik.from("bookings").select("id, room_id");
    // Verify each booking is for a room in pemilik's kos
    const valid = data?.every(b => pemilikRoomIds.includes(b.room_id)) ?? false;
    return { pass: valid && (data?.length || 0) === pemilikBookingCount,
      detail: `${data?.length || 0} bookings (expected ${pemilikBookingCount}), all in own kos: ${valid}` };
  });

  // 3d. Pemilik reads OTHER owner's booking — should fail
  if (allBookings) {
    const otherOwnerKos = allKos?.find(k => k.owner_id !== pemilikId);
    if (otherOwnerKos) {
      const otherOwnerRoomIds = allRooms?.filter(r => r.kos_id === otherOwnerKos.id).map(r => r.id) || [];
      const otherBooking = allBookings.find(b => otherOwnerRoomIds.includes(b.room_id));
      if (otherBooking) {
        await test("Pemilik reads OTHER owner's booking = BLOCKED", async () => {
          if (!pemilik) return { pass: false, detail: "Not logged in" };
          const { data } = await pemilik.from("bookings").select("id").eq("id", otherBooking.id).maybeSingle();
          return { pass: !data, detail: data ? `Got booking ${otherBooking.id.slice(0,12)}` : "Correctly blocked" };
        });
      }
    }
  }

  // 3e. Admin reads all bookings
  await test("Admin reads ALL bookings", async () => {
    const { data } = await admin.from("bookings").select("id").limit(100);
    return { pass: (data?.length || 0) >= 3, detail: `${data?.length || 0} bookings accessible` };
  });

  // 3f. Anon reads bookings (should fail)
  await test("Anon reads bookings = BLOCKED", async () => {
    const { data } = await anon.from("bookings").select("id").limit(1);
    return { pass: !data || data.length === 0, detail: data?.length > 0 ? `Got ${data.length} bookings` : "Correctly blocked" };
  });

  // ============================================================
  console.log("\n4. KOS — Public Listing Still Works");
  // ============================================================

  await test("Anon reads ALL kos (public listing)", async () => {
    const { data } = await anon.from("kos").select("id, name");
    return { pass: (data?.length || 0) > 0, detail: `${data?.length || 0} kos accessible to anon` };
  });

  await test("Siswa reads ALL kos (public listing)", async () => {
    if (!siswa) return { pass: false, detail: "Not logged in" };
    const { data } = await siswa.from("kos").select("id, name");
    return { pass: (data?.length || 0) > 0, detail: `${data?.length || 0} kos accessible to siswa` };
  });

  // ============================================================
  console.log("\n5. FAVORITES — Self-only Access");
  // ============================================================

  // Find siswa's favorites
  const siswaFavCount = allFavorites?.filter(f => f.student_id === siswaId).length || 0;

  await test("Siswa reads own favorites", async () => {
    if (!siswa) return { pass: false, detail: "Not logged in" };
    const { data } = await siswa.from("favorites").select("id, student_id, kos_id");
    const own = data?.filter(f => f.student_id === siswaId) || [];
    return { pass: own.length === siswaFavCount, detail: `${data?.length || 0} total, ${own.length} own (expected ${siswaFavCount})` };
  });

  // Check other student's favorites
  if (allFavorites) {
    const otherFav = allFavorites.find(f => f.student_id !== siswaId);
    if (otherFav) {
      await test("Siswa reads OTHER student's favorite = BLOCKED", async () => {
        if (!siswa) return { pass: false, detail: "Not logged in" };
        const { data } = await siswa.from("favorites").select("id").eq("id", otherFav.id).maybeSingle();
        return { pass: !data, detail: data ? `Got fav ${otherFav.id.slice(0,12)}` : "Correctly blocked" };
      });
    }
  }

  await test("Admin reads ALL favorites", async () => {
    const { data } = await admin.from("favorites").select("student_id, kos_id").limit(100);
    return { pass: (data?.length || 0) > 0, detail: `${data?.length || 0} favorites accessible` };
  });

  await test("Anon reads favorites = BLOCKED", async () => {
    const { data } = await anon.from("favorites").select("id").limit(1);
    return { pass: !data || data.length === 0, detail: data?.length > 0 ? `Got ${data.length} favorites` : "Correctly blocked" };
  });

  // ============================================================
  console.log("\n=== SUMMARY ===");
  // ============================================================
  console.log("\nAll tests complete.");
}

main().catch(console.error);
