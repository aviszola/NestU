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

const { session: admSession } = await login("test_admin@sle.test", "Test123456!");
if (!admSession) { console.log("❌ Admin login failed"); process.exit(1); }
const admin = authed(admSession);

// 1. Cek bucket via query langsung ke storage.buckets (RLS-aware)
try {
  const { data: bucket, error } = await admin
    .from("storage.buckets")
    .select("id, name, public")
    .eq("id", "bukti-transfer")
    .maybeSingle();
  console.log("storage.buckets query:", error ? `❌ ${error.message}` : `✅ ${JSON.stringify(bucket)}`);
} catch (e) { console.log("storage.buckets query threw:", e.message); }

// 2. Coba upload langsung ke bucket (paling akurat)
try {
  const dummy = new Blob(["dummy-proof"], { type: "image/jpeg" });
  const { error: upErr } = await admin.storage
    .from("bukti-transfer")
    .upload(`probe/${crypto.randomUUID()}.jpg`, dummy, { upsert: false });
  console.log("probe upload (admin):", upErr ? `❌ ${upErr.message}` : "✅ OK — bucket ada & writable");
} catch (e) { console.log("probe upload threw:", e.message); }

// 3. Cek policies via query (kalau bisa)
try {
  const { data: pols, error: polErr } = await admin
    .from("storage.objects")
    .select("name, bucket_id")
    .eq("bucket_id", "bukti-transfer")
    .limit(5);
  console.log("storage.objects list:", polErr ? `❌ ${polErr.message}` : `✅ ${pols?.length ?? 0} objects`);
} catch (e) { console.log("storage.objects threw:", e.message); }

// 4. Cek profil semua user (cari student B & owner B)
try {
  const { data: profiles, error } = await admin.from("profiles").select("id, email, role, full_name").limit(30);
  console.log("\nprofiles:", error ? `❌ ${error.message}` : "");
  for (const p of profiles ?? []) console.log("  -", p.role, "|", p.email, "|", p.full_name);
} catch (e) { console.log("profiles threw:", e.message); }

// 5. Cek kos & owner
try {
  const { data: kos, error } = await admin.from("kos").select("id, name, owner_id, verification_status").limit(30);
  console.log("\nkos:", error ? `❌ ${error.message}` : "");
  for (const k of kos ?? []) console.log("  -", k.name, "| owner:", k.owner_id?.slice(0, 12), "|", k.verification_status);
} catch (e) { console.log("kos threw:", e.message); }
