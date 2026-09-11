"use client";

import { ResponsiveContainer, BarChart, XAxis, YAxis, Bar } from "recharts";
import type { RevenueMonth } from "@/lib/supabase/analytics";

/** Bar chart — GMV renta per bulan (laatste 6 maanden). */
export default function RevenueChart({
  data,
}: {
  data: RevenueMonth[];
}) {
  const allZero = data.length === 0 || data.every((d) => d.revenue === 0);

  return (
    <div className="relative w-full">
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
      {allZero && (
        <div className="absolute inset-0 flex items-center justify-center text-on-surface-variant font-body-sm">
          Belum ada revenue di periode ini
        </div>
      )}
    </div>
  );
}