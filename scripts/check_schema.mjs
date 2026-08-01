import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const COLUMNS = [
  "id", "student_id", "room_id", "status", "notes", "move_in_date",
  "created_at", "updated_at",
  "duration_months", "total_amount", "base_monthly_price",
  "rejection_reason", "decided_by", "decided_at"
];

(async () => {
  for (const col of COLUMNS) {
    const { error } = await supabase
      .from("bookings")
      .select(col)
      .limit(0);
    if (error && error.code === "42703") {
      console.log(`❌ MISSING: ${col}`);
    } else if (error) {
      console.log(`⚠️  ERROR (${col}): ${error.message}`);
    } else {
      console.log(`✅ EXISTS: ${col}`);
    }
  }
})();
