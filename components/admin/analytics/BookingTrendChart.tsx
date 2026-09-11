"use client";

import { ResponsiveContainer, LineChart, XAxis, YAxis, Line } from "recharts";
import type { TrendPoint } from "@/lib/supabase/analytics";

/** Line chart — booking trend (nieuwe booking + completed) per dag. */
export default function BookingTrendChart({
  data,
}: {
  data: TrendPoint[];
}) {
  return (
    <div className="w-full">
      <ResponsiveContainer
        width="100%"
        height={280}
        initialDimension={{ width: 640, height: 280 }}
      >
        <LineChart data={data}>
          <XAxis dataKey="date" />
          <YAxis />
          <Line dataKey="newBookings" stroke="#00236f" strokeWidth={2} />
          <Line dataKey="completed" stroke="#006c49" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}