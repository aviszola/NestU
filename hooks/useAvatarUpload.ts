"use client";

import { useRef, useState } from "react";

/** Batas ukuran avatar: 2 MB. */
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

export interface UseAvatarUploadOptions {
  /** URL avatar yang sudah tersimpan di DB (dari profiles.avatar_url). */
  initialUrl?: string;
  /** Callback untuk melaporkan error validasi ke halaman pemanggil. */
  onError?: (msg: string) => void;
}

export interface UseAvatarUploadReturn {
  /** URL yang tersimpan di DB (diperbarui setelah upload berhasil). */
  avatarUrl: string;
  /** URL preview untuk ditampilkan di UI (bisa blob URL lokal). */
  avatarPreview: string;
  /** File yang dipilih user, null jika belum ada atau sudah di-reset. */
  avatarFile: File | null;
  /** Ref ke `<input type="file">` yang perlu dipasang di komponen UI. */
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  /** Handler untuk `<input onChange>` — memvalidasi tipe & ukuran. */
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Set ulang preview ke avatarUrl tersimpan (batalkan pilihan). */
  revertPreview: () => void;
  /** Hapus avatar (clear preview dan avatarUrl). */
  clearAvatar: () => void;
  /** Upload file yang dipilih ke bucket 'avatars'. Return URL publik, atau null jika gagal. */
  uploadAvatar: () => Promise<string | null>;
  /** Update avatarUrl setelah save profil berhasil. */
  commitUpload: (newUrl: string) => void;
  /** Inisialisasi hook dengan URL dari database (dipanggil setelah data user dimuat async). */
  initialize: (savedUrl: string) => void;
}

/**
 * Custom hook untuk mengelola upload avatar profil.
 * Satu sumber kebenaran — dipakai oleh /profile (siswa) dan /owner/profile.
 *
 * Aturan:
 * - Hanya file gambar (image/*) yang diterima.
 * - Ukuran maksimum 2 MB.
 * - Upload ke Supabase bucket "avatars" (public bucket).
 */
export function useAvatarUpload({
  initialUrl = "",
  onError,
}: UseAvatarUploadOptions = {}): UseAvatarUploadReturn {
  const [avatarUrl, setAvatarUrl] = useState(initialUrl);
  const [avatarPreview, setAvatarPreview] = useState(initialUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onError?.("File avatar harus berupa gambar, maksimal 2MB");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      onError?.("File avatar harus berupa gambar, maksimal 2MB");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function revertPreview() {
    setAvatarPreview(avatarUrl);
    setAvatarFile(null);
  }

  function clearAvatar() {
    setAvatarPreview("");
    setAvatarUrl("");
    setAvatarFile(null);
  }

  async function uploadAvatar(): Promise<string | null> {
    if (!avatarFile) return avatarUrl || null;

    // Import dynamically so the hook stays usable in both SSR-safe and client contexts.
    const { createClient } = await import("@/lib/supabase/client");
    const sup = createClient();

    const ext = avatarFile.name.split(".").pop() ?? "jpg";
    const filePath = `avatar-${Date.now()}.${ext}`;

    const { error: uploadError } = await sup.storage
      .from("avatars")
      .upload(filePath, avatarFile, { upsert: true });

    if (uploadError) {
      onError?.("Gagal upload avatar: " + uploadError.message);
      return null;
    }

    const { data } = sup.storage.from("avatars").getPublicUrl(filePath);
    return data.publicUrl;
  }

  function commitUpload(newUrl: string) {
    setAvatarUrl(newUrl);
    setAvatarFile(null);
  }

  /** Inisialisasi hook dengan URL dari database (dipanggil setelah data user dimuat). */
  function initialize(savedUrl: string) {
    setAvatarUrl(savedUrl);
    setAvatarPreview(savedUrl);
    setAvatarFile(null);
  }

  return {
    avatarUrl,
    avatarPreview,
    avatarFile,
    fileInputRef,
    handleFileChange,
    revertPreview,
    clearAvatar,
    uploadAvatar,
    commitUpload,
    initialize,
  };
}
