"use client";

import { toggleFavorite } from "@/lib/supabase/actions";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toastError, toastSuccess } from "@/lib/toast";

export default function FavoriteButton({
  kosId,
  initialFavorited,
  loggedIn,
}: {
  kosId: string;
  initialFavorited: boolean;
  loggedIn: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!loggedIn) return null;

  const handleClick = () => {
    if (pending) return;
    startTransition(async () => {
      const res = await toggleFavorite(kosId);
      if (res.error) {
        toastError("Gagal mengubah favorit: " + res.error);
        return;
      }
      toastSuccess(initialFavorited ? "Dihapus dari favorit" : "Ditambahkan ke favorit");
      router.refresh();
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className={`flex items-center gap-1 text-sm transition ${
        initialFavorited
          ? "text-error hover:text-error/80"
          : "text-outline hover:text-error"
      } ${pending ? "opacity-50" : ""}`}
      aria-label={initialFavorited ? "Hapus dari favorit" : "Tambah ke favorit"}
    >
      <svg
        viewBox="0 0 24 24"
        fill={initialFavorited ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
        className="h-5 w-5"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
