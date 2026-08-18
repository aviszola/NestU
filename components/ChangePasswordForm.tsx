"use client";

import { useState } from "react";

/** Form ganti password shared — dipakai /settings (siswa) dan /owner/settings (pemilik). */
export default function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next.length < 8) {
      setMsg({ type: "err", text: "Password baru minimal 8 karakter." });
      return;
    }
    if (next !== confirm) {
      setMsg({ type: "err", text: "Konfirmasi password tidak cocok." });
      return;
    }
    setLoading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const sup = createClient();
      const { error } = await sup.auth.updateUser({ password: next });
      if (error) throw error;
      setMsg({ type: "ok", text: "Password berhasil diubah!" });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err: any) {
      setMsg({ type: "err", text: err.message || "Gagal mengubah password." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-outline-variant p-6 space-y-5">
      <div>
        <label className="block text-sm font-medium text-on-surface-variant mb-1">Password Saat Ini</label>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="w-full rounded-lg border border-outline-variant px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-on-surface-variant mb-1">Password Baru</label>
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="Minimal 8 karakter"
          className="w-full rounded-lg border border-outline-variant px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-on-surface-variant mb-1">Konfirmasi Password Baru</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-lg border border-outline-variant px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          required
        />
      </div>

      {msg && (
        <div className={`p-3 rounded-lg text-sm font-medium ${msg.type === "ok" ? "bg-secondary/10 text-secondary" : "bg-error/10 text-error"}`}>
          {msg.text}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:opacity-90 transition disabled:opacity-50"
      >
        {loading ? "Menyimpan..." : "Ubah Password"}
      </button>
    </form>
  );
}
