"use client";

import { ResponsiveContainer, BarChart, XAxis, YAxis, Bar } from "recharts";
import type { RevenueMonth } from "@/lib/supabase/analytics";

/** Bar chart — GMV renta per bulan (laatste 6 maanden). */
export default function RevenueChart({
  data,
}: {
  data: RevenueMonth[];
}) {
  return (
    <div className="w-full">
      <ResponsiveContainer
        width="100%"
        height={280}
        initialDimension={{ width: 640, height: 280 }}
      >
        <BarChart data={data}>
          <XAxis dataKey="month" />
          <YAxis />
          <Bar dataKey="revenue" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}