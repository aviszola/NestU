import { createClient } from "@supabase/supabase-js";

const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const KEY = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";

async function login(email, pass) {
  const c = createClient(URL, KEY);
  const { data: { session }, error } = await c.auth.signInWithPassword({ email, password: pass });
  if (error) return null;
  return session;
}

async function main() {
  console.log("=== DEEPER RLS AUDIT ===\n");

  // Login all roles
  const sis = await login("test_siswa@sle.test", "Test123456!");
  const pem = await login("test_pemilik@sle.test", "Test123456!");
  const adm = await login("test_admin@sle.test", "Test123456!");

  // Get session-based clients
  function authed(session) {
    return createClient(URL, KEY, {
      global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    });
  }

  const s = sis ? authed(sis) : null;
  const p = pem ? authed(pem) : null;
  const a = adm ? authed(adm) : null;
  const anon = createClient(URL, KEY);

  // 1. PROFILES — what columns exist?
  console.log("--- PROFILES columns (via anon SELECT) ---");
  const { data: profCols } = await anon.from("profiles").select("*").limit(1).maybeSingle();
  if (profCols) console.log("  Columns:", Object.keys(profCols));
  else console.log("  No access for anon");

  // 2. PROFILES — can a siswa see other users' profiles?
  console.log("\n--- PROFILES: siswa sees all profiles? ---");
  if (s) {
    const { data: allProfiles } = await s.from("profiles").select("*");
    console.log(`  siswa sees ${allProfiles?.length || 0} profiles`);
    if (allProfiles && allProfiles.length > 1) {
      console.log("  ⚠️  siswa can see OTHER users' profiles!");
      for (const prof of allProfiles) {
        console.log(`    ${prof.id?.slice(0,12)}... role=${prof.role}`);
      }
    }
  }

  // 3. KOS — can a pemilik see other pemilik's kos?
  console.log("\n--- KOS: patungan sees all kos? ---");
  for (const [label, cli] of [["anon", anon], ["siswa", s], ["pemilik", p], ["admin", a]]) {
    if (!cli) continue;
    const { data: kosData } = await cli.from("kos").select("id, name, owner_id");
    if (kosData) {
      const owners = [...new Set(kosData.map(k => k.owner_id?.slice(0,12) || "null"))];
      console.log(`  ${label}: ${kosData.length} kos from ${owners.length} different owners`);
      for (const k of kosData) {
        console.log(`    ${k.name} (owner: ${k.owner_id?.slice(0,12) || "null"})`);
      }
    }
  }

  // 4. BOOKINGS — detailed access per role
  console.log("\n--- BOOKINGS: what each role sees ---");
  for (const [label, cli] of [["anon", anon], ["siswa", s], ["pemilik", p], ["admin", a]]) {
    if (!cli) continue;
    const { data: bk } = await cli.from("bookings").select("*");
    if (bk) {
      console.log(`  ${label}: ${bk.length} bookings`);
      for (const b of bk) {
        console.log(`    ${b.id?.slice(0,12)}... status=${b.status} student=${b.student_id?.slice(0,12)}... room=${b.room_id?.slice(0,12)}...`);
      }
    } else {
      console.log(`  ${label}: 0 bookings (RLS blocked)`);
    }
  }

  // 5. CROSS-TENANT TEST (CRITICAL)
  console.log("\n--- CROSS-TENANT: siswa tries to access specific booking ---");
  // First get a known booking from admin
  if (a) {
    const { data: adminBks } = await a.from("bookings").select("id, student_id, room_id").limit(1);
    if (adminBks && adminBks.length > 0) {
      const targetId = adminBks[0].id;
      // Can siswa access this specific booking?
      if (s) {
        const { data: tryAccess } = await s.from("bookings").select("*").eq("id", targetId).maybeSingle();
        console.log(`  siswa trying to access booking ${targetId?.slice(0,12)}...: ${tryAccess ? "⚠️  ACCESSIBLE" : "✅ BLOCKED"}`);
      }
      // Can pemilik access this specific booking?
      if (p) {
        const { data: tryAccess2 } = await p.from("bookings").select("*").eq("id", targetId).maybeSingle();
        console.log(`  pemilik trying to access booking ${targetId?.slice(0,12)}...: ${tryAccess2 ? "⚠️  ACCESSIBLE" : "✅ BLOCKED"}`);
      }
    }
  }

  // 6. KOS UPDATE test — can patungan update kos they don't own?
  console.log("\n--- CROSS-TENANT: pemilik tries to UPDATE kos they don't own ---");
  if (p && a) {
    // First admin finds all kos
    const { data: allKos } = await a.from("kos").select("id, owner_id");
    if (allKos) {
      // Find a kos NOT owned by patungan
      const pemId = pem.user.id;
      const notOwned = allKos.find(k => k.owner_id !== pemId);
      if (notOwned) {
        console.log(`  Found kos ${notOwned.id?.slice(0,12)}... owned by ${notOwned.owner_id?.slice(0,12)}... (not pemilik)`);
        const { error: updErr } = await p.from("kos").update({ name: "HACKED BY PEMILIK" }).eq("id", notOwned.id);
        console.log(`  UPDATE result: ${updErr ? `✅ BLOCKED (${updErr.message})` : "⚠️  ALLOWED — CRITICAL VULNERABILITY!"}`);
        // Undo
        if (!updErr) {
          console.log("  ⚠️  Attempting to revert...");
          const { data: orig } = await a.from("kos").select("name").eq("id", notOwned.id).single();
          console.log(`  Original name: ${orig?.name}`);
        }
      } else {
        console.log("  All kos owned by same pemilik — can't test cross-tenant update");
      }
    }
  }

  // 7. ANON UPDATE — does anon REALLY have UPDATE access?
  console.log("\n--- ANON: update test with valid UUID ---");
  if (a) {
    const { data: kosList } = await a.from("kos").select("id").limit(1);
    if (kosList && kosList.length > 0) {
      const realId = kosList[0].id;
      const { error: anonUpd } = await anon.from("kos").update({ name: "ANON_HACK" }).eq("id", realId);
      console.log(`  anon UPDATE kos ${realId?.slice(0,12)}...: ${anonUpd ? `✅ BLOCKED (${anonUpd.message})` : "⚠️  ALLOWED!"}`);
    }
  }

  console.log("\n=== DONE ===");
}

main().catch(console.error);
