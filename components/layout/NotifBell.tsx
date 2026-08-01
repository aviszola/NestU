"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/supabase/queries";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export default function NotifBell() {
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const [list, count] = await Promise.all([
          getNotifications(supabase, user.id, 10),
          getUnreadNotificationCount(supabase, user.id),
        ]);
        if (cancelled) return;
        setNotifs(list);
        setUnread(count);
      } catch {
        // silent — bell hidden when not authed or table missing
      }
    }
    load();
    // Refresh tiap 30 detik (polling ringan)
    const timer = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && !loading) {
      setLoading(true);
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const [list, count] = await Promise.all([
            getNotifications(supabase, user.id, 10),
            getUnreadNotificationCount(supabase, user.id),
          ]);
          setNotifs(list);
          setUnread(count);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
  }

  async function handleItemClick(n: NotificationItem) {
    if (!n.is_read) {
      try {
        const supabase = createClient();
        await markNotificationRead(supabase, n.id);
        setUnread((u) => Math.max(0, u - 1));
        setNotifs((list) =>
          list.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
        );
      } catch {
        // silent
      }
    }
    setOpen(false);
  }

  async function handleMarkAll() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await markAllNotificationsRead(supabase, user.id);
      setUnread(0);
      setNotifs((list) => list.map((x) => ({ ...x, is_read: true })));
    } catch {
      // silent
    }
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={toggleOpen}
        className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
        aria-label="Notifikasi"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unread > 0 && (
          <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-xl bg-surface-container-lowest card-shadow border border-outline-variant overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant bg-surface-container-low">
            <h3 className="font-label-md text-label-md text-on-surface font-bold uppercase tracking-wider">
              Notifikasi
            </h3>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="text-label-md text-primary font-bold hover:underline"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {loading ? (
              <p className="px-4 py-8 text-center text-body-sm text-outline">Memuat...</p>
            ) : notifs.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <span className="material-symbols-outlined text-4xl text-outline block mb-2">notifications_none</span>
                <p className="text-body-sm text-on-surface-variant">Belum ada notifikasi.</p>
              </div>
            ) : (
              notifs.map((n) => (
                <Link
                  key={n.id}
                  href={n.link || "#"}
                  onClick={() => handleItemClick(n)}
                  className={`block px-4 py-3 border-b border-outline-variant/50 transition-colors ${
                    n.is_read
                      ? "bg-surface-container-lowest hover:bg-surface-container-low"
                      : "bg-primary-container/10 hover:bg-primary-container/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                        n.is_read ? "bg-outline" : "bg-primary"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="font-label-md text-label-md font-bold text-on-surface">
                        {n.title}
                      </p>
                      <p className="text-body-sm text-on-surface-variant line-clamp-2 mt-0.5">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-outline mt-1">{formatTime(n.created_at)}</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
