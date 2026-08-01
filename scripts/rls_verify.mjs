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
  console.log("=== VERIFY: RLS UPDATE behavior (Supabase returns 200 even when RLS blocks) ===\n");

  const pemSession = await login("test_pemilik@sle.test", "Test123456!");
  const admSession = await login("test_admin@sle.test", "Test123456!");
  const anon = createClient(URL, KEY);
  const pem = pemSession ? createClient(URL, KEY, { global: { headers: { Authorization: `Bearer ${pemSession.access_token}` } } }) : null;
  const adm = admSession ? createClient(URL, KEY, { global: { headers: { Authorization: `Bearer ${admSession.access_token}` } } }) : null;

  if (!adm) { console.log("❌ admin login failed"); return; }

  // 1. Get a kos owned by someone else (not pemilik)
  const { data: allKos } = await adm.from("kos").select("id, name, owner_id");
  if (!allKos) { console.log("❌ no kos data"); return; }
  
  const pemId = pemSession?.user?.id;
  const notOwned = allKos.find(k => k.owner_id !== pemId);
  const owned = allKos.find(k => k.owner_id === pemId);

  console.log(`Pemilik user ID: ${pemId?.slice(0,12)}...`);
  console.log(`Kos owned by pemilik: ${owned ? owned.name : "NONE"}`);
  console.log(`Kos NOT owned by pemilik: ${notOwned ? notOwned.name : "NONE"}\n`);

  // 2. Test UPDATE on NOT-owned kos — check response body (status + data length)
  if (notOwned && pem) {
    console.log(`--- PEMILIK tries UPDATE on kos NOT owned (${notOwned.name}) ---`);
    
    // Check original name
    const { data: before } = await adm.from("kos").select("name").eq("id", notOwned.id).single();
    console.log(`  Before: name="${before?.name}"`);

    // Try UPDATE — REST API returns 200 even if RLS blocks; check count header
    const response = await fetch(`${URL}/rest/v1/kos?id=eq.${notOwned.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": KEY,
        "Authorization": `Bearer ${pemSession.access_token}`,
        "Prefer": "return=representation",
      },
      body: JSON.stringify({ name: "HACKED_BY_PEMILIK_RLS_TEST" }),
    });
    
    const status = response.status;
    const body = await response.text();
    const count = response.headers.get("content-range") || response.headers.get("x-total-count") || "N/A";
    console.log(`  Response: ${status} ${body}`);
    console.log(`  Count header: ${count}`);

    // Check if data actually changed
    const { data: after } = await adm.from("kos").select("name").eq("id", notOwned.id).single();
    console.log(`  After: name="${after?.name}"`);
    console.log(`  Data changed? ${before?.name !== after?.name ? "⚠️  YES (RLS FAILED!)" : "✅ NO (RLS blocked)"}`);

    // Revert if needed
    if (before && after?.name !== before.name) {
      await adm.from("kos").update({ name: before.name }).eq("id", notOwned.id);
      console.log("  Reverted original name");
    }
  }

  // 3. Test ANON UPDATE with real response inspection
  console.log(`\n--- ANON tries UPDATE on kos ${notOwned?.name} ---`);
  if (notOwned) {
    const { data: before2 } = await adm.from("kos").select("name").eq("id", notOwned.id).single();
    console.log(`  Before: name="${before2?.name}"`);

    const response2 = await fetch(`${URL}/rest/v1/kos?id=eq.${notOwned.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": KEY,
        "Prefer": "return=representation",
      },
      body: JSON.stringify({ name: "HACKED_BY_ANON_RLS_TEST" }),
    });
    
    const status2 = response2.status;
    const body2 = await response2.text();
    console.log(`  Response: ${status2} ${body2}`);

    const { data: after2 } = await adm.from("kos").select("name").eq("id", notOwned.id).single();
    console.log(`  After: name="${after2?.name}"`);
    console.log(`  Data changed? ${before2?.name !== after2?.name ? "⚠️  YES (RLS FAILED!)" : "✅ NO (RLS blocked)"}`);

    if (before2 && after2?.name !== before2.name) {
      await adm.from("kos").update({ name: before2.name }).eq("id", notOwned.id);
      console.log("  Reverted original name");
    }
  }

  // 4. Cross-tenant UPDATE on OWNED kos (should succeed)
  if (owned && pem) {
    console.log(`\n--- PEMILIK tries UPDATE on OWNED kos (${owned.name}) ---`);
    const { data: before3 } = await adm.from("kos").select("name").eq("id", owned.id).single();
    console.log(`  Before: name="${before3?.name}"`);

    const response3 = await fetch(`${URL}/rest/v1/kos?id=eq.${owned.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": KEY,
        "Authorization": `Bearer ${pemSession.access_token}`,
        "Prefer": "return=representation",
      },
      body: JSON.stringify({ name: "OWNED_BY_ME_RLS_TEST" }),
    });
    
    const status3 = response3.status;
    const body3 = await response3.text();
    console.log(`  Response: ${status3} ${body3}`);

    const { data: after3 } = await adm.from("kos").select("name").eq("id", owned.id).single();
    console.log(`  After: name="${after3?.name}"`);
    console.log(`  Data changed? ${before3?.name !== after3?.name ? "✅ YES (pemilik owns this)" : "❌ NO (blocked)"}`);

    if (before3) {
      await adm.from("kos").update({ name: before3.name }).eq("id", owned.id);
      console.log("  Reverted original name");
    }
  }

  // 5. profiles — check what ALL roles see  
  console.log(`\n--- Profiles columns ---`);
  const { data: profSample } = await adm.from("profiles").select("*").limit(1).single();
  console.log(`  Columns in profiles: ${profSample ? Object.keys(profSample).join(", ") : "N/A"}`);

  console.log("\n=== DONE ===");
}

main().catch(console.error);
