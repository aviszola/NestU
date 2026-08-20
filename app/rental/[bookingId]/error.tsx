"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Error boundary halaman detail kamar (siswa).
 * Error tak terduga di server component → ditangkap di sini,
 * tampilkan pesan jelas + tindakan, bukan crash kosong (500).
 */
export default function RentalDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[rental-detail] error boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mb-stack-md">
          <span className="material-symbols-outlined text-3xl text-error">
            error
          </span>
        </div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">
          Terjadi kesalahan
        </h1>
        <p className="text-body-md text-on-surface-variant mb-stack-md">
          Halaman tidak dapat dimuat saat ini. Silakan coba lagi — masalah ini
          biasanya bersifat sementara.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-sm hover:brightness-110 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined !text-[18px]">
              refresh
            </span>
            Coba Lagi
          </button>
          <Link
            href="/rental"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-outline-variant text-on-surface-variant rounded-xl font-bold text-sm hover:bg-surface-container-low transition"
          >
            <span className="material-symbols-outlined !text-[18px]">
              arrow_back
            </span>
            Kembali ke Kamar Saya
          </Link>
        </div>

        {error?.digest && (
          <p className="mt-stack-md text-xs text-outline">
            Kode kesalahan: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
