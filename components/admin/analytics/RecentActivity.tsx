"use client";

import Link from "next/link";
import type { ActivityRow } from "@/lib/supabase/analytics";

function fmtTime(t: string | null): string {
  if (!t) return "-";
  const d = new Date(t);
  return (
    d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }) +
    " " +
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  );
}

/** Relative time — "2 jam lalu". */
function relativeTime(t: string | null): string {
  if (!t) return "-";
  const secs = Math.floor((Date.now() - new Date(t).getTime()) / 1000);
  if (secs < 60) return "baru lalu";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} dau lalu`;
  const months = Math.floor(days / 30);
  return `${months} bulan lalu`;
}

/** Recent activity — admin_action_log (10 aksi terakhir). */
export default function RecentActivity({ rows }: { rows: ActivityRow[] }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl card-shadow overflow-hidden">
      <div className="px-4 py-3 font-title-lg text-title-lg text-on-surface">Recent Activity</div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-body-sm text-on-surface-variant">
          Tidak ada aksi admin recent.
        </p>
      ) : (
        <ul className="divide-y divide-outline-variant">
          {rows.map((r, i) => (
            <li key={i} className="px-4 py-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-on-surface-variant">
                  <span className="text-outline">[</span>{r.actor}<span className="text-outline">]</span>{" "}
                  {r.action}
                </span>
                <span className="text-outline shrink-0">{relativeTime(r.time)}</span>
              </div>
              <div className="text-sm text-on-surface">
                {r.href ? (
                  <Link href={r.href} className="hover:underline text-primary">{r.target}</Link>
                ) : (
                  <span className="text-on-surface-variant">{r.target}</span>
                )}
                {(r.oldValue ?? r.newValue) ? (
                  <span className="text-outline"> · {r.oldValue || "?"} → {r.newValue || "?"}</span>
                ) : null}
              </div>
              <div className="text-[11px] text-outline">{fmtTime(r.time)}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}