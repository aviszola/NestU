// Restore test booking txn_id after OLD-FN-CHECK overwrite
import { createClient } from "@supabase/supabase-js";
const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const ANON = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";
const anon = createClient(URL, ANON, { auth: { persistSession: false } });
// Old function still callable — use it to restore (until migration 017 drops it)
const r = await anon.rpc("handle_midtrans_webhook", {
  p_order_id: "book-2ecc4bf5-1785655620376",
  p_transaction_id: "test-txn-1787037998427",
  p_midtrans_status: "settlement",
  p_payment_status: "lunas",
});
console.log("restore:", r.error ? "FAIL " + r.error.message : "OK");

const sup = createClient(URL, ANON, { auth: { persistSession: false } });
const { data: login } = await sup.auth.signInWithPassword({ email: "test_siswa@sle.test", password: "Test123456!" });
const { data: bk } = await sup.from("bookings").select("payment_status,paid_at,midtrans_transaction_id").ilike("midtrans_order_id", "book-2ecc4bf5-1785655620376").maybeSingle();
console.log("final:", JSON.stringify(bk));
