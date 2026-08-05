// List id penuh booking test_siswa
import { createClient } from "@supabase/supabase-js";

const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const KEY = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";

const c = createClient(URL, KEY);
const { data: { session } } = await c.auth.signInWithPassword({ email: "test_siswa@sle.test", password: "Test123456!" });
const authed = createClient(URL, KEY, { global: { headers: { Authorization: `Bearer ${session.access_token}` } } });

const { data: bookings } = await authed.from("bookings")
  .select("id, status, payment_status, payment_method, midtrans_order_id, midtrans_status, paid_at, rooms:room_id(room_number, kos:kos_id(name))");

console.log("bookings test_siswa:", JSON.stringify(bookings, null, 1));
