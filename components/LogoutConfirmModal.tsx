"use client";

import { useEffect, useRef } from "react";
import { logout } from "@/lib/supabase/actions";

interface LogoutConfirmModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Modal konfirmasi sebelum logout dieksekusi.
 * - "Batal" / klik overlay / tombol X / Escape → tutup modal, user tetap login.
 * - "Ya, Keluar" → submit server action `logout` (signOut + redirect ke /login).
 * State buka/tutup di-manage oleh komponen pemanggil (tidak bocor antar halaman).
 */
export default function LogoutConfirmModal({ open, onClose }: LogoutConfirmModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    // Kunci scroll di belakang modal saat terbuka
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-confirm-title"
    >
      <div
        className="bg-white rounded-2xl card-shadow p-6 max-w-md w-full animate-modal-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 shrink-0 rounded-full bg-error/10 flex items-center justify-center text-error">
            <span className="material-symbols-outlined text-2xl">logout</span>
          </div>
          <div className="flex-1">
            <h3
              id="logout-confirm-title"
              className="font-title-lg text-title-lg text-on-surface font-bold"
            >
              Yakin ingin keluar?
            </h3>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Kamu perlu login lagi untuk mengakses akun NestU.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="shrink-0 -m-1 p-1 text-outline hover:text-on-surface-variant transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant rounded-xl font-bold text-sm hover:bg-surface-container-low transition"
          >
            Batal
          </button>
          <form action={logout} className="flex-1">
            <button
              type="submit"
              className="w-full py-2.5 bg-error text-on-error rounded-xl font-bold text-sm hover:brightness-110 active:scale-[0.99] transition"
            >
              Ya, Keluar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}