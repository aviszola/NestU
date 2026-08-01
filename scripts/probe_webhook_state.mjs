import { createClient } from "@supabase/supabase-js";

const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const KEY = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";

async function login(email, pass) {
  const c = createClient(URL, KEY);
  const { data: { session } } = await c.auth.signInWithPassword({ email, password: pass });
  return session;
}
function authed(session) {
  return createClient(URL, KEY, {
    global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  });
}

const adm = await login("test_admin@sle.test", "Test123456!");
const admin = authed(adm);

// 1. Cek function handle_midtrans_webhook ada (via anon RPC probe)
const anon = createClient(URL, KEY);
const probe = await anon.rpc("handle_midtrans_webhook", {
  p_order_id: "__probe_nonexistent__",
  p_transaction_id: "x",
  p_midtrans_status: "pending",
  p_payment_status: "belum_bayar",
});
console.log("anon RPC probe (harus error 'tidak ditemukan' = function ADA):", probe.error?.message ?? "NO ERROR - function tak ada atau terbuka");

// 2. Cek bookings terbaru — cari yang payment_method=midtrans atau payment_status berubah
const { data: bookings } = await admin.from("bookings").select("id, status, payment_status, payment_method, midtrans_status, midtrans_transaction_id, paid_at").order("created_at", { ascending: false }).limit(10);
console.log("\nBooking terbaru:");
for (const b of bookings ?? []) {
  console.log(`  - ${b.id.slice(0, 12)} | status=${b.status} | pay=${b.payment_status} | method=${b.payment_method ?? "-"} | mid=${b.midtrans_status ?? "-"} | tx=${b.midtrans_transaction_id ? b.midtrans_transaction_id.slice(0, 12) : "-"} | paid_at=${b.paid_at ?? "-"}`);
}

// 3. Cek notifications terbaru
const { data: notifs } = await admin.from("notifications").select("user_id, title, created_at").order("created_at", { ascending: false }).limit(5);
console.log("\nNotifikasi terbaru:");
for (const n of notifs ?? []) {
  console.log(`  - ${n.user_id.slice(0, 12)} | ${n.title} | ${n.created_at}`);
}
