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

// Detail booking midtrans
const { data: b } = await admin.from("bookings")
  .select("*, rooms:room_id(room_number, price_per_month, kos:kos_id(name, owner_id))")
  .eq("midtrans_order_id", "not-null").limit(1);
// cari yang punya order
const { data: bookings } = await admin.from("bookings")
  .select("id, student_id, total_amount, payment_status, midtrans_order_id, midtrans_transaction_id, midtrans_status, payment_method, created_at")
  .eq("payment_method", "midtrans");
console.log("Booking midtrans:", JSON.stringify(bookings, null, 1));

// Owner kos booking itu
if (bookings?.[0]) {
  const { data: room } = await admin.from("rooms").select("kos:kos_id(owner_id)").eq("id", bookings[0].room_id).single();
  console.log("Owner kos:", room?.kos?.owner_id);
}
