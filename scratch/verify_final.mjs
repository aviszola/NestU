// Final verification: what works and what doesn't after all migrations
import { createClient } from "@supabase/supabase-js";

const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const ANON = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";
const anon = createClient(URL, ANON, { auth: { persistSession: false } });

// 1. OLD function — gone?
const r1 = await anon.rpc("handle_midtrans_webhook", { p_order_id: "x", p_transaction_id: "x", p_midtrans_status: "x", p_payment_status: "x" });
console.log("1. OLD fn:", r1.error ? "GONE ✅ " + r1.error.message.slice(0, 70) : "⚠️ MASIH ADA");

// 2. NEW function — anon call (should fail: permission denied, NOT digest error)
const r2 = await anon.rpc("handle_midtrans_webhook_secure", { p_order_id: "x", p_transaction_id: "x", p_midtrans_status: "x", p_payment_status: "x", p_webhook_secret: "x" });
console.log("2. NEW fn anon:", r2.error ? "BLOCKED ✅ " + r2.error.message.slice(0, 90) : "⚠️ CALLABLE");

// 3. Restore booking via NEW function with correct server key as anon? No — need service role.
//    Try calling with the actual env secret — but anon can't. The route uses service role via
//    createClient() with anon key though... check supabase/server setup.
const env = await import("fs").then(f => f.readFileSync("c:/SLE/.env.local", "utf8"));
console.log("3. env has SUPABASE_SERVICE_ROLE_KEY:", /SUPABASE_SERVICE_ROLE_KEY[= ]+\S+/.test(env) ? "YES" : "NO");
