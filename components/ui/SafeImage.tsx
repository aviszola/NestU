"use client";

import { useState } from "react";

/**
 * img aman untuk Server Component: RSC tidak bisa serialisasi onError.
 * Kalau src gagal dimuat, elemen disembunyikan (perilaku sama dengan
 * onError display:none yang dulu dipakai inline di server page).
 * fallbackSrc opsional — ganti ke gambar placeholder kalau disediakan.
 */
export default function SafeImage({
  fallbackSrc,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & { fallbackSrc?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed && !fallbackSrc) return null;

  return (
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    <img
      {...props}
      src={failed ? fallbackSrc : props.src}
      onError={() => setFailed(true)}
    />
  );
}
