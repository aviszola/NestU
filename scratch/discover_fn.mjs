// Check which function signatures exist in schema cache
import { createClient } from "@supabase/supabase-js";
const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const ANON = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";
const anon = createClient(URL, ANON, { auth: { persistSession: false } });

// Try calling with different arg styles to discover signature
const attempts = [
  { name: "positional 5 args", call: () => anon.rpc("handle_midtrans_webhook", { p_order_id: "x", p_transaction_id: "x", p_midtrans_status: "x", p_payment_status: "x" }) },
  { name: "old arg names", call: () => anon.rpc("handle_midtrans_webhook", { order_id: "x", transaction_id: "x", midtrans_status: "x", payment_status: "x" }) },
];
for (const a of attempts) {
  const r = await a.call();
  console.log(a.name, "→", r.error ? "ERR: " + r.error.message.slice(0, 90) : "OK: " + JSON.stringify(r.data));
}

// Check if schema cache just needs refresh — try listing via raw query
const { data, error } = await anon.from("bookings").select("id").limit(1);
console.log("bookings query:", error ? "ERR " + error.message : "OK");

// Try querying pg_proc through a view? Not accessible via REST. Skip.
// Check the booking state (unchanged since restore failed)
const sup = createClient(URL, ANON, { auth: { persistSession: false } });
const { data: login } = await sup.auth.signInWithPassword({ email: "test_siswa@sle.test", password: "Test123456!" });
const { data: bk } = await sup.from("bookings").select("midtrans_transaction_id,payment_status").ilike("midtrans_order_id", "book-2ecc4bf5-1785655620376").maybeSingle();
console.log("booking:", JSON.stringify(bk));
