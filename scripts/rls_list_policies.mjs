import { createClient } from "@supabase/supabase-js";

const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const KEY = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";

async function login(email, pass) {
  const c = createClient(URL, KEY);
  const { data: { session }, error } = await c.auth.signInWithPassword({ email, password: pass });
  return { session, error };
}

async function main() {
  const { session: admSession } = await login("test_admin@sle.test", "Test123456!");
  const admin = admSession ? createClient(URL, KEY, { global: { headers: { Authorization: `Bearer ${admSession.access_token}` } } }) : null;
  if (!admin) { console.log("Login failed"); return; }

  // Try to query pg_policies via Supabase
  // First try: Supabase has a pg_policies table accessible to authenticated users
  const { data: policies, error: pe } = await admin.from("pg_policies").select("*");
  if (pe) console.log("pg_policies error:", pe.message);
  else console.log("pg_policies:", JSON.stringify(policies, null, 2));

  // Try via raw SQL
  console.log("\n--- Trying via rpc ---");
  // Some Supabase projects have a function to list policies
  try {
    const r = await admin.rpc("get_policies", { schemas: ["public"] });
    console.log("get_policies:", JSON.stringify(r));
  } catch(e) {
    console.log("get_policies not available");
  }
  
  // Alternative: query information_schema
  console.log("\n--- Trying via information_schema ---");
  const { data: cols, error: ce } = await admin
    .from("columns")
    .select("table_name, column_name, data_type")
    .eq("table_schema", "public");
  if (ce) console.log("columns error:", ce.message);
  else console.log("sample columns:", cols?.slice(0,5));
}

main().catch(console.error);
