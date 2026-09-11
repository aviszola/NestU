"use client";

import { formatRupiah } from "@/lib/supabase/analytics";
import type { TopOwnerRow } from "@/lib/supabase/analytics";

/** Top 10 pemilik by revenue. */
export default function TopOwnersTable({ rows }: { rows: TopOwnerRow[] }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl card-shadow overflow-hidden">
      <div className="px-4 py-3 font-title-lg text-title-lg text-on-surface">Top Pemilik</div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-body-sm text-on-surface-variant">
          Belum ada data di periode ini.
        </p>
      ) : (
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md">
            <tr>
              <th className="px-3 py-2">Pemilik</th>
              <th className="px-3 py-2 text-right">Kos</th>
              <th className="px-3 py-2 text-right">Booking</th>
              <th className="px-3 py-2 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {rows.map((r) => (
              <tr key={r.ownerId} className="hover:bg-surface-container-lowest">
                <td className="px-3 py-2 text-on-surface">{r.ownerName}</td>
                <td className="px-3 py-2 text-on-surface-variant text-right">{r.kosCount}</td>
                <td className="px-3 py-2 text-on-surface-variant text-right">{r.bookings}</td>
                <td className="px-3 py-2 text-on-surface-variant text-right">
                  {formatRupiah(r.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}