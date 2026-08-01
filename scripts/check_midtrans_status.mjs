import { createClient } from "@supabase/supabase-js";
import pkg from "midtrans-client";
const { CoreApi } = pkg;

const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const KEY = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";
const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || "";

// Cek status transaksi di Midtrans via CoreApi (butuh server key)
if (!SERVER_KEY) {
  console.log("MIDTRANS_SERVER_KEY kosong di env lokal — tidak bisa cek status Midtrans");
} else {
  const core = new CoreApi({
    isProduction: false,
    serverKey: SERVER_KEY,
    clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "",
  });
  try {
    const status = await core.transaction.status("book-35730f0b-1785591304350");
    console.log("Midtrans status:", JSON.stringify({
      order_id: status.order_id,
      transaction_status: status.transaction_status,
      fraud_status: status.fraud_status,
      payment_type: status.payment_type,
      transaction_id: status.transaction_id,
      gross_amount: status.gross_amount,
    }, null, 1));
  } catch (e) {
    console.log("Midtrans status error:", e.message);
  }
}

// Detail booking + room + kos + owner
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

const { data: b } = await admin.from("bookings")
  .select("id, student_id, total_amount, status, rooms:room_id(id, room_number, kos:kos_id(id, name, owner_id))")
  .eq("id", "35730f0b-173e-4c9b-9149-7d87c98c50df")
  .single();
console.log("\nBooking detail:", JSON.stringify(b, null, 1));
