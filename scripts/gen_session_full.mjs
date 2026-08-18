// Generate FULL Supabase session JSON utk injeksi cookie (QA)
import { createClient } from "@supabase/supabase-js";

const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const KEY = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";

const role = process.argv[2] || "pemilik";
const creds = {
  siswa: ["test_siswa@sle.test", "Test123456!"],
  pemilik: ["test_pemilik@sle.test", "Test123456!"],
  admin: ["test_admin@sle.test", "Test123456!"],
};
const [email, pass] = creds[role];

const c = createClient(URL, KEY, { auth: { persistSession: false } });
const { data, error } = await c.auth.signInWithPassword({ email, password: pass });
if (error) { console.error("login fail:", error.message); process.exit(1); }

const fs = await import("fs");
fs.writeFileSync("scratch/session_full_" + role + ".json", JSON.stringify(data.session, null, 2));
console.log("Full session saved:", data.session.access_token.slice(0, 12), "exp:", data.session.expires_at);
