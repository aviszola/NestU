"use client";

import { useState, useTransition } from "react";
import { submitBooking } from "@/lib/supabase/actions";

export default function SubmitBookingButton({ kosId, roomId }: { kosId: string; roomId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    try {
      setError(null);
      const startDate = (document.getElementById("start_date") as HTMLInputElement)?.value;
      const duration = (document.getElementById("duration") as HTMLSelectElement)?.value;
      const notes = (document.getElementById("notes") as HTMLTextAreaElement)?.value;

      if (!startDate) {
        setError("Silakan pilih tanggal pindah");
        return;
      }

      const todayStr = new Date().toISOString().split("T")[0];
      if (startDate < todayStr) {
        setError("Tanggal masuk tidak boleh di masa lalu");
        return;
      }

      if (!duration) {
        setError("Silakan pilih durasi sewa");
        return;
      }

      const formData = new FormData();
      formData.set("kosId", kosId);
      formData.set("roomId", roomId);
      formData.set("start_date", startDate);
      formData.set("duration", duration);
      formData.set("notes", notes ?? "");

      startTransition(async () => {
        try {
          const result = await submitBooking(formData);
          
          if (result.success) {
            // Redirect ke halaman bookings jika berhasil
            window.location.href = "/bookings";
          } else {
            setError(result.error || "Gagal mengajukan booking. Silakan coba lagi.");
          }
        } catch (err: any) {
          setError("Terjadi kesalahan tidak terduga. Silakan coba lagi.");
        }
      });
    } catch (err: any) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg bg-error-container text-on-error-container p-3 text-sm">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="w-full py-3 bg-primary text-white font-bold rounded-full hover:opacity-90 transition disabled:opacity-50 shadow-lg shadow-primary/20"
      >
        {isPending ? "Memproses..." : "Ajukan Booking Sekarang"}
      </button>
    </div>
  );
}
