import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

(async () => {
  console.log("=== Check rooms for booking test ===\n");

  // Get kos with rooms
  const { data: kosts, error: kosError } = await supabase
    .from("kosts")
    .select("id, name")
    .limit(3);

  if (kosError) { console.log("Kos query error:", kosError.message); return; }
  if (!kosts || kosts.length === 0) { console.log("No kosts found"); return; }

  console.log(`Found ${kosts.length} kosts:\n`);
  for (const kos of kosts) {
    const { data: rooms } = await supabase
      .from("rooms")
      .select("id, room_number, price_per_month")
      .eq("kos_id", kos.id);
    
    console.log(`  ${kos.name} (${kos.id.slice(0,8)}...): ${rooms?.length || 0} rooms`);
    if (rooms && rooms.length > 0) {
      for (const r of rooms) {
        console.log(`    Room ${r.room_number}: Rp${r.price_per_month}/mo [${r.id.slice(0,8)}...]`);
      }
    }
  }

  // Check bookings table
  const { data: bookings, count } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: false })
    .limit(5);

  console.log(`\n=== Existing bookings: ${count} ===`);
  if (bookings && bookings.length > 0) {
    for (const b of bookings) {
      console.log(`  ${b.id?.slice(0,8)}... status=${b.status} amount=${b.total_amount} dur=${b.duration_months} base=${b.base_monthly_price}`);
    }
  }
})();
