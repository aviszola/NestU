import { createClient } from "@supabase/supabase-js";

const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const KEY = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";

async function login(email, pass) {
  const c = createClient(URL, KEY);
  const { data: { session }, error } = await c.auth.signInWithPassword({ email, password: pass });
  return { session, error };
}

async function main() {
  console.log("=== DIAGNOSTIC: Check RLS policies and auth context ===\n");

  const { session: admSession } = await login("test_admin@sle.test", "Test123456!");
  const { session: sisSession } = await login("test_siswa@sle.test", "Test123456!");
  const admin = admSession ? createClient(URL, KEY, { global: { headers: { Authorization: `Bearer ${admSession.access_token}` } } }) : null;
  const siswa = sisSession ? createClient(URL, KEY, { global: { headers: { Authorization: `Bearer ${sisSession.access_token}` } } }) : null;

  if (!admin || !siswa) { console.log("Login failed"); return; }

  // 1. Check current user ids
  console.log(`Admin user ID: ${admSession.user.id}`);
  console.log(`Siswa user ID: ${sisSession.user.id}`);

  // 2. Check admin profile
  const { data: adminProfile } = await admin.from("profiles").select("id, role").eq("id", admSession.user.id).single();
  console.log(`\nAdmin profile role: ${adminProfile?.role}`);
  console.log(`Is admin role == 'admin'? ${adminProfile?.role === 'admin'}`);

  // 3. Check siswa profile  
  const { data: sisProfile } = await admin.from("profiles").select("id, role").eq("id", sisSession.user.id).single();
  console.log(`\nSiswa profile role: ${sisProfile?.role}`);

  // 4. Try is_admin() function directly
  console.log(`\n--- Testing is_admin() function ---`);
  
  // As admin
  const r1 = await admin.rpc("is_admin");
  console.log(`Admin calls is_admin(): ${JSON.stringify(r1)}`);
  
  // As siswa
  const r2 = await siswa.rpc("is_admin");
  console.log(`Siswa calls is_admin(): ${JSON.stringify(r2)}`);

  // 5. Check if old profiles policies still exist by testing with raw fetch
  console.log(`\n--- Checking profiles access via raw fetch ---`);
  
  // Siswa tries to read profile of admin
  const resp = await fetch(`${URL}/rest/v1/profiles?id=eq.${admSession.user.id}&select=id,role,full_name`, {
    headers: {
      "apikey": KEY,
      "Authorization": `Bearer ${sisSession.access_token}`,
    }
  });
  const text = await resp.text();
  console.log(`Siswa reads admin profile via REST: status=${resp.status}, body=${text.substring(0,200)}`);

  // Siswa tries to read own profile
  const resp2 = await fetch(`${URL}/rest/v1/profiles?id=eq.${sisSession.user.id}&select=id,role,full_name`, {
    headers: {
      "apikey": KEY,
      "Authorization": `Bearer ${sisSession.access_token}`,
    }
  });
  const text2 = await resp2.text();
  console.log(`Siswa reads own profile via REST: status=${resp2.status}, body=${text2.substring(0,200)}`);

  // 6. Try favorites as admin
  console.log(`\n--- Favorites admin access ---`);
  const f1 = await admin.from("favorites").select("*");
  console.log(`Admin favorites: ${JSON.stringify(f1.data?.length)} rows, error: ${f1.error?.message}`);

  // Direct REST for favorites as admin
  const resp3 = await fetch(`${URL}/rest/v1/favorites?select=id,student_id,kos_id`, {
    headers: {
      "apikey": KEY,
      "Authorization": `Bearer ${admSession.access_token}`,
    }
  });
  const text3 = await resp3.text();
  console.log(`Admin favorites via REST: status=${resp3.status}, body=${text3.substring(0,300)}`);

  // 7. Check bookings for test_siswa
  console.log(`\n--- Checking bookings for siswa ---`);
  const b1 = await admin.from("bookings").select("id, student_id").eq("student_id", sisSession.user.id);
  console.log(`Admin finds bookings for siswa: ${JSON.stringify(b1.data?.length)} rows`);
  if (b1.data) for (const b of b1.data) console.log(`  Booking: ${b.id.substring(0,12)}...`);

  console.log("\n=== DIAGNOSTIC DONE ===");
}

main().catch(console.error);
