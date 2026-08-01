import { createClient } from "@supabase/supabase-js";

const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const KEY = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";

const supabase = createClient(URL, KEY);

async function testAnonAccess(table) {
  const results = { table, select: null, insert: null, update: null, delete: null };
  
  // SELECT — can we read any rows?
  const { data: selData, error: selErr, status: selStatus } = await supabase
    .from(table)
    .select("*")
    .limit(1);
  results.select = { ok: !selErr, rows: selData?.length ?? 0, error: selErr?.message || null, status: selStatus };

  // INSERT (test) — try inserting a minimal row, then rollback (can't in REST, so just check error)
  // We'll do a targeted INSERT with dummy data and see if it's rejected
  // For safety, use a random suffix
  const testId = `test_rls_${Date.now()}`;
  
  console.log(JSON.stringify(results, null, 2));
  return results;
}

async function main() {
  console.log("=== RLS Audit: Testing Anon Key Access ===\n");
  console.log("(Anon key = same level as unauthenticated public)\n");

  const tables = ["kos", "rooms", "bookings", "profiles", "favorites", "kos_facilities", "facilities"];

  for (const table of tables) {
    console.log(`\n--- ${table} ---`);
    
    // Test SELECT
    const { data: selData, error: selErr } = await supabase
      .from(table)
      .select("*")
      .limit(1);
    console.log(`  SELECT: ${selErr ? `❌ BLOCKED (${selErr.message})` : `✅ ${selData?.length || 0} rows accessible`}`);

    // Test INSERT (minimal payload)
    const dummy = { id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}` };
    const { error: insErr } = await supabase.from(table).insert(dummy);
    console.log(`  INSERT: ${!insErr ? `⚠️  ALLOWED (no RLS!)` : `✅ BLOCKED (${insErr.message})`}`);

    // Test UPDATE
    const { error: updErr } = await supabase.from(table).update({}).eq("id", "nonexistent");
    console.log(`  UPDATE: ${!updErr ? `⚠️  ALLOWED` : `✅ BLOCKED (${updErr.message})`}`);

    // Test DELETE
    const { error: delErr } = await supabase.from(table).delete().eq("id", "nonexistent");
    console.log(`  DELETE: ${!delErr ? `⚠️  ALLOWED` : `✅ BLOCKED (${delErr.message})`}`);
  }

  // Now login as each role and test
  console.log("\n\n=== Role-based Access Tests ===\n");

  const roles = [
    { email: "test_siswa@sle.test", pass: "Test123456!", label: "siswa" },
    { email: "test_pemilik@sle.test", pass: "Test123456!", label: "pemilik" },
    { email: "test_admin@sle.test", pass: "Test123456!", label: "admin" },
  ];

  for (const role of roles) {
    const authClient = createClient(URL, KEY);
    const { data: { session }, error: loginErr } = await authClient.auth.signInWithPassword({
      email: role.email,
      password: role.pass,
    });
    
    if (loginErr || !session) {
      console.log(`\n--- ${role.label} LOGIN FAILED: ${loginErr?.message} ---`);
      continue;
    }
    console.log(`\n--- ${role.label} (${session.user.email}) ---`);

    // Create authenticated client
    const authed = createClient(URL, KEY, {
      global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    });

    // Test each table
    for (const table of tables) {
      const { data, error, status } = await authed.from(table).select("*").limit(3);
      if (error) {
        console.log(`  ${table} SELECT: ❌ ${error.message}`);
      } else {
        console.log(`  ${table} SELECT: ✅ ${data?.length || 0} rows`);
        
        // Show first row's keys to understand what's visible
        if (data && data.length > 0) {
          const keys = Object.keys(data[0]);
          // Show a sample but mask sensitive values
          const sample = {};
          for (const k of ["id", "name", "title", "role", "email", "status", "price_per_month", "room_number"]) {
            if (keys.includes(k)) sample[k] = data[0][k];
          }
          console.log(`    ↳ ${JSON.stringify(sample)}`);
        }
      }
    }
  }

  console.log("\n\n=== DONE ===");
}

main().catch(console.error);
