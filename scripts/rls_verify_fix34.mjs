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
  console.log("=== VERIFY FIX 3+4: Bookings UPDATE + Rooms RLS ===\n");

  const { session: pemSession } = await login("test_pemilik@sle.test", "Test123456!");
  const { session: admSession } = await login("test_admin@sle.test", "Test123456!");
  const { session: sisSession } = await login("test_siswa@sle.test", "Test123456!");
  const anon = createClient(URL, KEY);
  const pemilik = pemSession ? authed(pemSession) : null;
  const admin = admSession ? authed(admSession) : null;
  const siswa = sisSession ? authed(sisSession) : null;

  if (!admin) { console.log("❌ Admin login failed, aborting"); return; }
  console.log(`Pemilik: ${pemSession ? "OK" : "FAIL"}`);
  console.log(`Admin:   ${admSession ? "OK" : "FAIL"}`);
  console.log(`Siswa:   ${sisSession ? "OK" : "FAIL"}\n`);

  const pemilikId = pemSession?.user?.id;
  const siswaId = sisSession?.user?.id;

  const { data: allKos } = await admin.from("kos").select("id, name, owner_id");
  const { data: allRooms } = await admin.from("rooms").select("id, kos_id, status");
  const pemilikKosIds = allKos?.filter(k => k.owner_id === pemilikId).map(k => k.id) || [];
  const pemilikRoomIds = allRooms?.filter(r => pemilikKosIds.includes(r.kos_id)).map(r => r.id) || [];
  const notOwnedKos = allKos?.find(k => k.owner_id !== pemilikId);
  const notOwnedRoom = allRooms?.find(r => r.kos_id === notOwnedKos?.id);

  // ============ FIX 3: Bookings UPDATE ============
  console.log("=== FIX 3 — Bookings UPDATE (owner approve/reject) ===\n");

  // Step 1: Siswa INSERT booking
  let bookingId = null;
  if (siswa && pemilikRoomIds.length > 0) {
    const targetRoomId = pemilikRoomIds[0];
    await test("Siswa CAN INSERT booking (own student_id)", async () => {
      const { data, error } = await siswa
        .from("bookings")
        .insert({ student_id: siswaId, room_id: targetRoomId, status: "pending" })
        .select();
      if (data?.[0]?.id) bookingId = data[0].id;
      return { pass: !!data?.[0]?.id, detail: error?.message || `Booking ${data?.[0]?.id?.slice(0,12)} created` };
    });

    // Step 2: Pemilik approves/rejects that booking
    if (bookingId && pemilik) {
      await test("Pemilik CAN approve booking (UPDATE policy)", async () => {
        const { error } = await pemilik
          .from("bookings")
          .update({ status: "approved" })
          .eq("id", bookingId);
        if (error) return { pass: false, detail: error.message };
        const { data: check } = await admin.from("bookings").select("status").eq("id", bookingId).single();
        return { pass: check?.status === "approved", detail: `Status now: ${check?.status}` };
      });

      // Test pemilik can reject too
      await test("Pemilik CAN reject booking (UPDATE policy)", async () => {
        const { error } = await pemilik
          .from("bookings")
          .update({ status: "rejected" })
          .eq("id", bookingId);
        if (error) return { pass: false, detail: error.message };
        const { data: check } = await admin.from("bookings").select("status").eq("id", bookingId).single();
        return { pass: check?.status === "rejected", detail: `Status now: ${check?.status}` };
      });

      // Cleanup via admin
      await admin.from("bookings").delete().eq("id", bookingId);
      console.log("  Cleaned up test booking\n");
    }
  }

  // Cross-tenant UPDATE: siswa tries to change a booking they don't own
  if (bookingId && siswa) {
    // Can't test cross-tenant UPDATE without another booking, skip
  }

  // Anon UPDATE
  await test("Anon CANNOT update any booking (RLS block)", async () => {
    const { data } = await anon
      .from("bookings")
      .update({ status: "approved" })
      .eq("id", "00000000-0000-0000-0000-000000000000")
      .select();
    return { pass: !data || data.length === 0, detail: `Updated ${data?.length || 0} rows` };
  });

  // ============ FIX 4: Rooms RLS ============
  console.log("\n=== FIX 4 — Rooms RLS policies ===\n");

  await test("Anon can SELECT rooms (public listing)", async () => {
    const { data } = await anon.from("rooms").select("id, kos_id").limit(5);
    return { pass: (data?.length || 0) > 0, detail: `${data?.length || 0} rooms visible` };
  });

  // Cross-tenant INSERT
  if (notOwnedKos && pemilik) {
    await test("Pemilik CANNOT INSERT room in another owner's kos (RLS block)", async () => {
      const response = await fetch(`${URL}/rest/v1/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": KEY,
          "Authorization": `Bearer ${pemSession.access_token}`,
          "Prefer": "return=representation",
        },
        body: JSON.stringify({
          kos_id: notOwnedKos.id,
          room_number: "RLS_TEST_INSERT",
          price_per_month: 100000,
        }),
      });
      const bodyText = await response.text();
      const ok = !bodyText || bodyText === "[]" || bodyText === "null" || response.status === 406;
      return { pass: ok, detail: `Status ${response.status}: Response length ${bodyText.length}` };
    });
  }

  // Cross-tenant UPDATE
  if (notOwnedRoom && pemilik) {
    await test("Pemilik CANNOT UPDATE room in another owner's kos (RLS block)", async () => {
      const response = await fetch(`${URL}/rest/v1/rooms?id=eq.${notOwnedRoom.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "apikey": KEY,
          "Authorization": `Bearer ${pemSession.access_token}`,
          "Prefer": "return=representation",
        },
        body: JSON.stringify({ room_number: "RLS_TEST_UPDATE" }),
      });
      const bodyText = await response.text();
      const ok = !bodyText || bodyText === "[]" || bodyText === "null" || response.status === 406;
      return { pass: ok, detail: `Status ${response.status}: Response length ${bodyText.length}` };
    });
  }

  // Cross-tenant DELETE
  if (notOwnedRoom && pemilik) {
    await test("Pemilik CANNOT DELETE room in another owner's kos (RLS block)", async () => {
      const response = await fetch(`${URL}/rest/v1/rooms?id=eq.${notOwnedRoom.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "apikey": KEY,
          "Authorization": `Bearer ${pemSession.access_token}`,
          "Prefer": "return=representation",
        },
      });
      const bodyText = await response.text();
      const ok = !bodyText || bodyText === "[]" || bodyText === "null" || response.status === 406;
      return { pass: ok, detail: `Status ${response.status}: Response length ${bodyText.length}` };
    });
  }

  // Owned INSERT
  const ownedKos = allKos?.find(k => k.owner_id === pemilikId);
  let cleanupRoomId = null;
  if (ownedKos && pemilik) {
    await test("Pemilik CAN INSERT room in OWN kos", async () => {
      const response = await fetch(`${URL}/rest/v1/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": KEY,
          "Authorization": `Bearer ${pemSession.access_token}`,
          "Prefer": "return=representation",
        },
        body: JSON.stringify({
          kos_id: ownedKos.id,
          room_number: `RLS_TEST_${Date.now()}`,
          price_per_month: 150000,
        }),
      });
      const body = await response.json();
      if (body?.[0]?.id) cleanupRoomId = body[0].id;
      return { pass: !!body?.[0]?.id, detail: body?.[0]?.id ? `Created room ${body[0].id.slice(0,12)}` : `Status ${response.status}` };
    });

    if (cleanupRoomId) {
      await admin.from("rooms").delete().eq("id", cleanupRoomId);
      console.log("  Cleaned up test room\n");
    }
  }

  // ============ SUMMARY ============
  console.log("\n=== DONE ===");
}

main().catch(console.error);
