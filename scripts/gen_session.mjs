// Generate session cookie value utk di-inject ke browser QA
import { createClient } from "@supabase/supabase-js";

const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const KEY = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";

const role = process.argv[2] || "siswa";
const creds = {
  siswa: ["test_siswa@sle.test", "Test123456!"],
  pemilik: ["test_pemilik@sle.test", "Test123456!"],
  admin: ["test_admin@sle.test", "Test123456!"],
};
const [email, pass] = creds[role];

const c = createClient(URL, KEY, { auth: { persistSession: false } });
const { data, error } = await c.auth.signInWithPassword({ email, password: pass });
if (error) { console.error("login fail:", error.message); process.exit(1); }

// Simpan session utk dipakai browser
const fs = await import("fs");
fs.writeFileSync("scratch/session_" + role + ".json", JSON.stringify({
  access_token: data.session.access_token,
  refresh_token: data.session.refresh_token,
  expires_at: data.session.expires_at,
  user_id: data.user.id,
}, null, 2));
console.log("Session saved utk", role, "user:", data.user.id.slice(0, 8));
