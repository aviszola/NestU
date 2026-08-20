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

/**
 * Format nomor WA lokal (08xxx) jadi format internasional (628xxx) untuk URL wa.me.
 * wa.me butuh kode negara TANPA angka 0 di depan.
 * - "081234567890" → "6281234567890"
 * - "6281234567890" → "6281234567890" (sudah internasional)
 * - "+62 812-3456-7890" → "6281234567890"
 * - null/""/non-digit → "" (link tidak dibuat)
 */
export function formatWhatsAppNumber(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("8")) return "62" + digits;
  return ""; // format tak dikenal (mis. dimulai kode negara lain)
}

/** Petakan error Supabase Auth SDK ke Bahasa Indonesia yang ramah & sopan. */
export function mapAuthError(err: any): string {
  if (!err) return "Gagal memproses otentikasi. Silakan coba lagi.";
  const msg = (typeof err === "string" ? err : err.message || err.error_description || "").toLowerCase();
  const status = err?.status || 0;

  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials") || msg.includes("invalid password") || msg.includes("user not found")) {
    return "Email atau password salah. Silakan periksa kembali.";
  }
  if (msg.includes("email not confirmed")) {
    return "Email Anda belum dikonfirmasi. Silakan periksa inbox email Anda.";
  }
  if (msg.includes("user already registered") || msg.includes("already registered") || msg.includes("email address already in use")) {
    return "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.";
  }
  if (msg.includes("password should be at least")) {
    return "Password minimal 6 karakter.";
  }
  if (msg.includes("rate limit") || msg.includes("too many requests") || status === 429) {
    return "Terlalu banyak percobaan. Silakan tunggu beberapa saat lagi.";
  }
  if (msg.includes("fetch failed") || msg.includes("networkerror") || msg.includes("failed to fetch") || msg.includes("timeout")) {
    return "Koneksi internet bermasalah. Silakan periksa koneksi Anda dan coba lagi.";
  }

  return "Gagal memproses otentikasi. Silakan coba beberapa saat lagi.";
}
