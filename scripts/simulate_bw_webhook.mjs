// Simulasi webhook midtrans utk booking 2ecc4bf5 — order settlement → lunas
import { createClient } from "@supabase/supabase-js";

const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const KEY = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";

const anon = createClient(URL, KEY);
const { data, error } = await anon.rpc("handle_midtrans_webhook", {
  p_order_id: "book-2ecc4bf5-1785655620376",
  p_transaction_id: "simulate-replay",
  p_midtrans_status: "settlement",
  p_payment_status: "lunas",
});
console.log("RPC result:", data, "error:", error?.message ?? "-");

// Verifikasi state baru via test_siswa
const c = createClient(URL, KEY);
const { data: { session } } = await c.auth.signInWithPassword({ email: "test_siswa@sle.test", password: "Test123456!" });
const authed = createClient(URL, KEY, { global: { headers: { Authorization: `Bearer ${session.access_token}` } } });
const { data: b } = await authed.from("bookings").select("id, status, payment_status, payment_method, midtrans_status, paid_at").eq("id", "2ecc4bf5-ec0e-4ac4-aeac-fa0f05432487").maybeSingle();
console.log("\nState baru:", JSON.stringify(b, null, 1));
