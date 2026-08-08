// Verifikasi kredensial ketiga role + daftar halaman yang bisa diakses tanpa login
import { createClient } from "@supabase/supabase-js";

const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const KEY = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";

const roles = [
  { email: "test_siswa@sle.test", name: "siswa" },
  { email: "test_pemilik@sle.test", name: "pemilik" },
  { email: "test_admin@sle.test", name: "admin" },
];

for (const r of roles) {
  const c = createClient(URL, KEY, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email: r.email, password: "Test123456!" });
  if (error) console.log(`${r.name}: FAIL — ${error.message}`);
  else {
    const prof = await c.from("profiles").select("role").eq("id", data.user.id).single();
    console.log(`${r.name}: OK — user=${data.user.id.slice(0,8)} role=${prof.data?.role ?? "?"} email=${data.user.email}`);
  }
}
