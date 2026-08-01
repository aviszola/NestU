import { createClient } from "@supabase/supabase-js";

const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const KEY = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";

async function login(email, pass) {
  const c = createClient(URL, KEY);
  const { data, error } = await c.auth.signInWithPassword({ email, password: pass });
  if (error || !data?.session) return null;
  return data.session;
}

function authed(session) {
  return createClient(URL, KEY, { global: { headers: { Authorization: `Bearer ${session.access_token}` } } });
}

async function main() {
  const adminS = await login("test_admin@sle.test", "Test123456!");
  if (!adminS) { console.log("Admin login fail"); return; }
  const admin = authed(adminS);

  // Find students who HAVE bookings
  const { data: allB } = await admin.from("bookings").select("id, student_id, status");
  const studentsWithBookings = [...new Set(allB?.map(b => b.student_id) || [])];
  console.log(`Students with bookings: ${studentsWithBookings.length}`);
  
  for (const sid of studentsWithBookings) {
    const { data: prof } = await admin.from("profiles").select("full_name").eq("id", sid).single();
    console.log(`  ${sid.slice(0,12)}... ${prof?.full_name || '?'}`);
  }

  // Test each student can see ONLY their own bookings
  for (const sid of studentsWithBookings) {
    const { data: prof } = await admin.from("profiles").select("full_name").eq("id", sid).single();
    if (!prof?.full_name) continue;
    
    // Try to login as this student using email-like pattern
    // Students might not have direct login, skip
    continue;
  }

  // Test pemilik who has kos with bookings
  const { data: allKos } = await admin.from("kos").select("id, name, owner_id");
  const ownersWithKos = [...new Set(allKos?.map(k => k.owner_id) || [])];
  
  for (const oid of ownersWithKos) {
    const { data: prof } = await admin.from("profiles").select("full_name, role").eq("id", oid).single();
    if (!prof) continue;
    const kos = allKos?.filter(k => k.owner_id === oid) || [];
    console.log(`\n${prof.role}: ${prof.full_name} (${oid.slice(0,12)}...) — ${kos.length} kos`);
    
    // Try to login
    const email = prof.full_name?.toLowerCase().includes("pemilik") 
      ? `test_${prof.full_name?.toLowerCase().replace(/[^a-z0-9]/g,'')}@sle.test`
      : null;
    if (email) {
      const session = await login(email, "Test123456!");
      if (session) {
        const ap = authed(session);
        const { data: bp } = await ap.from("bookings").select("id, room_id, status");
        console.log(`  Bookings visible: ${bp?.length || 0}`);
        
        // Verify all belong to their kos
        const kosIds = kos.map(k => k.id);
        const { data: rooms } = await admin.from("rooms").select("id, kos_id").in("kos_id", kosIds);
        const roomIds = new Set(rooms?.map(r => r.id) || []);
        const violations = bp?.filter(b => !roomIds.has(b.room_id)) || [];
        console.log(`  Cross-kos violations: ${violations.length} ${violations.length > 0 ? '❌' : '✅'}`);
        
        // Detail
        for (const b of bp || []) {
          const r = rooms?.find(r => r.id === b.room_id);
          const k = allKos?.find(k => k.id === r?.kos_id);
          console.log(`    booking ${b.id.slice(0,12)} room=${b.room_id.slice(0,12)} kos=${k?.name || '?'}`);
        }
      } else {
        console.log(`  Cannot login as ${email} — skip`);  
      }
    }
  }

  // E2E student with bookings — find one via admin data
  console.log(`\n--- E2E: Siswa A logs in and sees only own bookings ---`);
  // The known student accounts and their IDs
  const knownStudents = [
    { id: "e0de3fb9-a994-41ea-96eb-e252fc41625c", name: "user1" },
    { id: "2eda21f0-79a6-4270-9087-32ee1b207287", name: "Avis" },
    { id: "47312989-bec4-4d46-851a-02d8a742da08", name: "siswa2" },
  ];
  
  for (const s of knownStudents) {
    // Try to log in with various email patterns
    const emails = [
      `${s.name}@sle.test`,
      `test_${s.name}@sle.test`,
      `${s.name.toLowerCase()}@gmail.com`,
    ];
    let session = null;
    for (const e of emails) {
      session = await login(e, "Test123456!");
      if (session) { console.log(`  Logged in as ${e} (${s.id.slice(0,12)}...)`); break; }
    }
    
    if (session) {
      const ap = authed(session);
      const { data: bp } = await ap.from("bookings").select("id, student_id, status");
      const own = bp?.filter(b => b.student_id === session.user.id) || [];
      const other = bp?.filter(b => b.student_id !== session.user.id) || [];
      console.log(`  Bookings: ${bp?.length || 0} total, ${own.length} own, ${other.length} other's`);
      if (own.length > 0) {
        console.log(`  ✅ Student sees own bookings`);
      }
      console.log(`  Cross-student access: ${other.length === 0 ? '✅ blocked' : '❌ LEAK!'}`);
      
      for (const b of bp || []) {
        console.log(`    ${b.id.slice(0,12)} status=${b.status} student=${b.student_id.slice(0,12)}` + (b.student_id === session.user.id ? ' (own)' : ' (OTHER!)'));
      }
    }
  }
}

main().catch(console.error);
