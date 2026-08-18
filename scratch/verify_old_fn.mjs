// Deep check: OLD function still callable — does it still UPDATE bookings?
import { createClient } from "@supabase/supabase-js";

const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const ANON = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";
const anon = createClient(URL, ANON, { auth: { persistSession: false } });

// Read current state via authenticated siswa
const sup = createClient(URL, ANON, { auth: { persistSession: false } });
const { data: login } = await sup.auth.signInWithPassword({ email: "test_siswa@sle.test", password: "Test123456!" });

const before = await sup.from("bookings").select("paid_at,midtrans_transaction_id").ilike("midtrans_order_id", "book-2ecc4bf5-1785655620376").maybeSingle();

// Call OLD function as anon with real order
const r = await anon.rpc("handle_midtrans_webhook", {
  p_order_id: "book-2ecc4bf5-1785655620376",
  p_transaction_id: "OLD-FN-CHECK",
  p_midtrans_status: "settlement",
  p_payment_status: "lunas",
});
console.log("OLD fn call:", r.error ? "ERROR: " + r.error.message : "returned: " + r.data);

const after = await sup.from("bookings").select("paid_at,midtrans_transaction_id").ilike("midtrans_order_id", "book-2ecc4bf5-1785655620376").maybeSingle();
console.log("before:", JSON.stringify(before));
console.log("after: ", JSON.stringify(after));
console.log("BERUBAH:", after?.midtrans_transaction_id === "OLD-FN-CHECK" ? "🚨 YA — OLD fn masih bisa update!" : "tidak berubah");
