"use client";

import Image from "next/image";
import type { UseAvatarUploadReturn } from "@/hooks/useAvatarUpload";

interface AvatarUploadFieldProps {
  /** Semua nilai dan handler dari useAvatarUpload(). */
  avatar: UseAvatarUploadReturn;
  /** Initial letter untuk fallback inisial (huruf pertama nama). */
  initial: string;
  /** Apakah field saat ini dalam mode edit (kontrol tampil tombol). */
  isEditing?: boolean;
  /** Ukuran avatar dalam pixel (default 64). */
  size?: number;
}

/**
 * Komponen UI upload avatar yang reusable.
 * Pakai bersama useAvatarUpload() hook.
 * Dipakai oleh /profile (siswa) dan /owner/profile.
 */
export default function AvatarUploadField({
  avatar,
  initial,
  isEditing = true,
  size = 64,
}: AvatarUploadFieldProps) {
  const { avatarPreview, avatarUrl, fileInputRef, handleFileChange, revertPreview, clearAvatar } = avatar;
  const sizeClass = `rounded-full object-cover border-2 border-outline-variant`;

  return (
    <div className="flex items-center gap-4">
      {/* Preview atau inisial */}
      {avatarPreview ? (
        <Image
          src={avatarPreview}
          alt="Avatar"
          width={size}
          height={size}
          style={{ width: size, height: size }}
          className={sizeClass}
        />
      ) : (
        <div
          style={{ width: size, height: size }}
          className={`${sizeClass} bg-primary text-on-primary flex items-center justify-center font-bold`}
          aria-label="Inisial nama"
        >
          <span style={{ fontSize: size * 0.375 }}>{initial}</span>
        </div>
      )}

      {/* Kontrol — hanya tampil saat isEditing */}
      {isEditing && (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Ganti Foto Profil
          </button>
          <p className="text-xs text-outline">JPG, PNG, atau WebP. Maks. 2 MB.</p>

          {/* Tombol "Batalkan perubahan" — file baru dipilih tapi belum disimpan */}
          {avatarPreview && avatarPreview !== avatarUrl && (
            <button
              type="button"
              onClick={revertPreview}
              className="block text-xs text-error hover:underline"
            >
              Batalkan perubahan
            </button>
          )}

          {/* Tombol "Hapus foto" — avatar tersimpan masih ada, belum ada file baru */}
          {avatarUrl && avatarPreview === avatarUrl && (
            <button
              type="button"
              onClick={clearAvatar}
              className="block text-xs text-error hover:underline"
            >
              Hapus foto
            </button>
          )}
        </div>
      )}

      {/* Input file tersembunyi */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Pilih foto profil"
      />
    </div>
  );
}
