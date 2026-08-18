// Check current DB state: which functions exist, is secret set
import { createClient } from "@supabase/supabase-js";
const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const ANON = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";
const anon = createClient(URL, ANON, { auth: { persistSession: false } });

// Test secure function with WRONG secret → should give "Invalid webhook secret" if pgcrypto works + secret set
const r = await anon.rpc("handle_midtrans_webhook_secure", {
  p_order_id: "book-2ecc4bf5-1785655620376",
  p_transaction_id: "t",
  p_midtrans_status: "settlement",
  p_payment_status: "lunas",
  p_webhook_secret: "WRONG-SECRET",
});
console.log("secure fn, wrong secret:", r.error ? "ERR: " + r.error.message : "⚠️ CALLED (data=" + r.data + ")");

// Read .env secret to test with correct one
import { readFileSync } from "fs";
const env = readFileSync("c:/SLE/.env.local", "utf8");
const secret = env.match(/MIDTRANS_WEBHOOK_SECRET=(\S+)/)?.[1];

const r2 = await anon.rpc("handle_midtrans_webhook_secure", {
  p_order_id: "book-2ecc4bf5-1785655620376",
  p_transaction_id: "t2",
  p_midtrans_status: "settlement",
  p_payment_status: "lunas",
  p_webhook_secret: secret,
});
console.log("secure fn, CORRECT secret:", r2.error ? "ERR: " + r2.error.message : "✅ CALLED (data=" + r2.data + ")");
