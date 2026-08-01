import { createClient } from "@supabase/supabase-js";

const URL = "https://fwdbfikwckhvpbmenydq.supabase.co";
const KEY = "sb_publishable_o2h7loPvfZmM5vazlIVO6A_OAM5665O";
const supabase = createClient(URL, KEY);

(async () => {
  // Login as siswa
  const { data: { session } } = await supabase.auth.signInWithPassword({
    email: "test_siswa@sle.test",
    password: "Test123456!"
  });

  if (!session) { console.log("❌ Login failed"); return; }
  console.log("✅ Logged in as test_siswa");

  // Use known kos & room
  const kosId = "4dd94805-a730-4b81-8736-7fd77987d83d";
  const roomId = "24db2c30-f063-4e62-a238-efa085090d03"; // A1, Rp1.000.000/mo

  // Check room price
  const { data: room } = await supabase
    .from("rooms")
    .select("price_per_month")
    .eq("id", roomId)
    .single();
  console.log(`Room price: Rp${room?.price_per_month}/mo`);

  // Direct booking insert (simulating submitBooking action)
  const duration = 3;
  const total = room.price_per_month * duration + 25000 + 5000; // + service + admin fee
  const insertData = {
    student_id: session.user.id,
    room_id: roomId,
    move_in_date: "2026-08-15",
    duration_months: duration,
    total_amount: total,
    base_monthly_price: room.price_per_month,
    notes: "Test booking dari RBAC test",
    status: "pending",
  };

  console.log("\nInsert data:", JSON.stringify(insertData, null, 2));
  console.log(`Expected total: Rp${room.price_per_month} × ${duration} + 25000 + 5000 = Rp${total}`);

  const { data, error } = await supabase
    .from("bookings")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.log(`\n❌ Insert error: [${error.code}] ${error.message}`);
    if (error.code === "42703") console.log("  → Missing column detected, run migration first");
  } else {
    console.log(`\n✅ Booking created! ID: ${data.id}`);
    console.log(`  Status: ${data.status}`);
    console.log(`  Total amount: Rp${data.total_amount}`);
    console.log(`  Duration: ${data.duration_months} months`);
    console.log(`  Base price: Rp${data.base_monthly_price}`);
    console.log(`  Expected: Rp${total}`);
    console.log(`  Matches: ${data.total_amount === total ? "✅ YES" : "❌ NO"}`);
  }

  // Clean up test booking
  if (data && !error) {
    await supabase.from("bookings").delete().eq("id", data.id);
    console.log("  (test booking deleted)");
  }

  console.log("\n=== DONE ===");
})();
