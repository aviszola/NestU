export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "N/A";
  try {
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "N/A";
  }
}

/** Ubah error Supabase mentah / HTTP 400 jadi pesan yang bisa dibaca user. */
export function toReadableError(err: any): string {
  if (!err) return "Terjadi kesalahan";
  const code = (err?.code || "").toLowerCase();
  const msg = err?.message || err?.error_description || "";
  if (code === "42501" || code === "pgrst116" || /row.?level.?security|rls policy|permission denied|new row violates/i.test(msg)) {
    return "Anda tidak memiliki izin untuk mengubah booking ini.";
  }
  if (/^\d{3}$/.test(msg.trim())) {
    return "Terjadi kesalahan saat memproses booking. Silakan coba lagi.";
  }
  return msg || "Terjadi kesalahan";
}
