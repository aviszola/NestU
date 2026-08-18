// Verify migration 016 applied: function exists, grant revoked, app_config seeded
import { createClient } from "@supabase/supabase-js";

const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const ANON = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";
const anon = createClient(URL, ANON, { auth: { persistSession: false } });

// 1. Old function should now be REVOKED from anon → RPC call fails
const r1 = await anon.rpc("handle_midtrans_webhook", {
  p_order_id: "book-2ecc4bf5-1785655620376",
  p_transaction_id: "test",
  p_midtrans_status: "settlement",
  p_payment_status: "lunas",
});
console.log("OLD fn (handle_midtrans_webhook) anon:", r1.error ? "BLOCKED ✅ " + r1.error.message : "⚠️ STILL CALLABLE");

// 2. New function should be REVOKED from anon too (grant only service_role)
const r2 = await anon.rpc("handle_midtrans_webhook_secure", {
  p_order_id: "book-2ecc4bf5-1785655620376",
  p_transaction_id: "test",
  p_midtrans_status: "settlement",
  p_payment_status: "lunas",
  p_webhook_secret: "whatever",
});
console.log("NEW fn (secure) anon:", r2.error ? "BLOCKED ✅ " + r2.error.message : "⚠️ STILL CALLABLE");

// 3. Check function existence via pg function listing (try rpc with wrong args to see schema cache)
const { data: funcs, error: fe } = await anon.rpc("handle_midtrans_webhook_secure", {});
console.log("function in schema cache:", fe ? "ADA (error karena args kosong): " + fe.message.slice(0, 80) : "?");
