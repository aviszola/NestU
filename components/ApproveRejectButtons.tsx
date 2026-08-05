"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveBooking, rejectBooking } from "@/lib/supabase/actions";
import { toastError } from "@/lib/toast";

export default function ApproveRejectButtons({
  bookingId,
}: {
  bookingId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleApprove = () => {
    startTransition(async () => {
      try {
        await approveBooking(bookingId);
        router.refresh();
      } catch (e: any) {
        toastError(e?.message || "Gagal menyetujui booking");
      }
    });
  };

  const handleReject = () => {
    startTransition(async () => {
      try {
        await rejectBooking(bookingId);
        router.refresh();
      } catch (e: any) {
        toastError(e?.message || "Gagal menolak booking");
      }
    });
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleApprove}
        disabled={isPending}
        className="px-3 py-1 bg-secondary-container text-on-secondary-container text-xs font-bold rounded-full hover:opacity-80 transition disabled:opacity-50"
      >
        Konfirmasi
      </button>
      <button
        onClick={handleReject}
        disabled={isPending}
        className="px-3 py-1 bg-error-container text-on-error-container text-xs font-bold rounded-full hover:opacity-80 transition disabled:opacity-50"
      >
        Tolak
      </button>
    </div>
  );
}
