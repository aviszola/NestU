"use client";

import Link from "next/link";
import type { ActivityRow } from "@/lib/supabase/analytics";

function fmtTime(t: string | null): string {
  if (!t) return "-";
  const d = new Date(t);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }) +
    " " +
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

/** Recent activity — admin_action_log (10 aksi terakhir). */
export default function RecentActivity({ rows }: { rows: ActivityRow[] }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl card-shadow overflow-hidden">
      <div className="px-4 py-3 font-title-lg text-title-lg text-on-surface">Recent Activity</div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-body-sm text-on-surface-variant">
          Geen recente aksi admin.
        </p>
      ) : (
        <ul className="divide-y divide-outline-variant">
          {rows.map((r, i) => (
            <li key={i} className="px-4 py-3">
              <div className="flex items-center gap-1 text-xs text-outline">
                {r.actor} · {r.action} · {fmtTime(r.time)}
              </div>
              <div className="text-sm text-on-surface">
                {r.href ? (
                  <Link href={r.href} className="hover:underline text-primary">{r.target}</Link>
                ) : (
                  <span className="text-on-surface-variant">{r.target}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}