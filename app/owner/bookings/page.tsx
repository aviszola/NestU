"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { updateBookingStatus } from "@/lib/supabase/queries";
import { useEffect, useState } from "react";
import OwnerShell from "@/components/layout/OwnerShell";

const statusColors: Record<string, string> = {
  pending: "bg-tertiary/10 text-tertiary",
  confirmed: "bg-secondary/10 text-secondary",
  cancelled: "bg-error/10 text-error",
  completed: "bg-primary/10 text-primary",
};

const statusLabels: Record<string, string> = {
  pending: "Menunggu",
  confirmed: "Dikonfirmasi",
  cancelled: "Dibatalkan",
  completed: "Selesai",
};

export default function OwnerBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAllBookings() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all kos owned by this user
      const { data: kosList } = await supabase
        .from("kos")
        .select("id, name")
        .eq("owner_id", user.id);

      if (!kosList || kosList.length === 0) {
        setBookings([]);
        return;
      }

      const kosIds = kosList.map((k) => k.id);

      // Get room_ids that belong to these kos
      const { data: rooms } = await supabase
        .from("rooms")
        .select("id")
        .in("kos_id", kosIds);

      if (!rooms || rooms.length === 0) {
        setBookings([]);
        return;
      }

      const roomIds = rooms.map((r) => r.id);

      // Get bookings for those rooms (bookings has no kos_id, must filter via room_id → rooms → kos)
      const { data: bookings } = await supabase
        .from("bookings")
        .select("*, rooms:room_id(id, room_number, price_per_month, kos:kos_id(id, name))")
        .in("room_id", roomIds)
        .order("created_at", { ascending: false });

      // Load student profiles separately (no FK for embed)
      if (bookings && bookings.length > 0) {
        const studentIds = [...new Set(bookings.map((b: any) => b.student_id))];
        const { data: profiles } = await supabase
          .from("profiles_public")
          .select("id, full_name")
          .in("id", studentIds);
        const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));
        const enriched = (bookings as any[]).map((b: any) => ({
          ...b,
          student: profileMap[b.student_id] ?? null,
        }));
        setBookings(enriched);
      } else {
        setBookings([]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAllBookings();
  }, []);

  async function handleStatus(id: string, status: "approved" | "cancelled" | "completed") {
    try {
      const supabase = createClient();
      await updateBookingStatus(supabase, id, status);
      loadAllBookings();
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) return <p className="text-outline">Memuat...</p>;

  return (
    <OwnerShell activePage="bookings">
      <div className="px-margin-mobile md:px-margin-desktop py-stack-lg">
        <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold mb-stack-lg">
          Permintaan Booking
        </h1>

        {bookings.length === 0 ? (
          <div className="text-center py-12 text-on-surface-variant font-body-md">
            <span className="material-symbols-outlined text-4xl text-outline block mb-2">calendar_month</span>
            Belum ada permintaan booking untuk properti Anda.
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b: any) => (
              <Card key={b.id}>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-on-surface">
                      {b.student?.full_name ?? "User"} — {b.rooms?.kos?.name}
                    </p>
                    <p className="text-sm text-on-surface-variant">
                      {b.rooms?.room_number} ·{" "}
                      {new Date(b.created_at).toLocaleDateString("id-ID")}
                    </p>
                    {b.notes && (
                      <p className="text-xs text-outline">
                        Catatan: {b.notes}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[b.status]}`}>
                    {statusLabels[b.status]}
                  </span>
                </div>
                {b.status === "pending" && (
                  <div className="mt-4 flex gap-2 border-t border-outline-variant pt-4">
                    <Button onClick={() => handleStatus(b.id, "approved")}>
                      Konfirmasi
                    </Button>
                    <Button variant="danger" onClick={() => handleStatus(b.id, "cancelled")}>
                      Tolak
                    </Button>
                  </div>
                )}
                {b.status === "approved" && (
                  <div className="mt-4 flex gap-2 border-t border-outline-variant pt-4">
                    <Button variant="secondary" onClick={() => handleStatus(b.id, "completed")}>
                      Tandai Selesai
                    </Button>
                    <Button variant="danger" onClick={() => handleStatus(b.id, "cancelled")}>
                      Batalkan
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg bg-error/10 text-error p-3 text-sm font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {error}
          </div>
        )}
      </div>
    </OwnerShell>
  );
}
