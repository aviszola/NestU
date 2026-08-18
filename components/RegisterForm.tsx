"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

const SCHOOLS = [
  "SMK Negeri 1 Jakarta",
  "SMK Taruna Bhakti",
  "Universitas Indonesia",
  "Binus University",
  "Lainnya...",
];

/** Satu-satunya form registrasi NestU — dipakai di /register dan tab Daftar di /login. */
export default function RegisterForm({
  onSuccess,
  compact = false,
}: {
  onSuccess?: () => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [school, setSchool] = useState("");
  const [role, setRole] = useState<"siswa" | "pemilik">("siswa");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputCls =
    "w-full px-4 py-3 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all bg-white text-sm text-on-surface placeholder-outline";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!agreeTerms) {
      setError("Harap setujui Syarat & Ketentuan dan Kebijakan Privasi.");
      return;
    }
    if (role === "siswa" && !school) {
      setError("Pilih Nama Sekolah / Universitas.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            phone,
            role,
            school_name: role === "siswa" ? school : null,
          },
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error("Registrasi gagal");
      onSuccess?.();
      router.push("/login?registered=true");
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat mendaftar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-error/10 border border-error/20 text-error p-3 text-sm font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">error</span>
          {error}
        </div>
      )}

      <div>
        <label className="block font-label-md text-label-md text-on-surface-variant mb-1">
          Nama Lengkap
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Masukkan nama lengkap"
          required
          className={inputCls}
        />
      </div>

      <div>
        <label className="block font-label-md text-label-md text-on-surface-variant mb-1">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="contoh@email.com"
          required
          className={inputCls}
        />
      </div>

      <div>
        <label className="block font-label-md text-label-md text-on-surface-variant mb-1">
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 6 karakter"
            required
            minLength={6}
            className={`${inputCls} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-primary"
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          >
            <span className="material-symbols-outlined">
              {showPassword ? "visibility" : "visibility_off"}
            </span>
          </button>
        </div>
      </div>

      <div>
        <label className="block font-label-md text-label-md text-on-surface-variant mb-1">
          Nomor WhatsApp
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="081234..."
          required
          className={inputCls}
        />
      </div>

      {/* Sekolah/Universitas — hanya untuk siswa */}
      {role === "siswa" && (
        <div>
          <label className="block font-label-md text-label-md text-on-surface-variant mb-1">
            Nama Sekolah / Universitas
          </label>
          <select
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            className={`${inputCls} appearance-none`}
          >
            <option value="" disabled>
              Pilih Institusi Pendidikan
            </option>
            {SCHOOLS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
          Daftar sebagai
        </label>
        <div className="flex gap-3">
          {(["siswa", "pemilik"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                role === r
                  ? "bg-primary text-on-primary shadow-sm"
                  : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {r === "siswa" ? "Siswa" : "Pemilik Kos"}
            </button>
          ))}
        </div>
      </div>

      {/* Consent */}
      <div className="flex items-start space-x-2 pt-2">
        <input
          type="checkbox"
          id="terms"
          checked={agreeTerms}
          onChange={(e) => setAgreeTerms(e.target.checked)}
          className="mt-1 w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary"
        />
        <label
          htmlFor="terms"
          className="font-body-sm text-body-sm text-on-surface-variant"
        >
          Saya menyetujui{" "}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Syarat &amp; Ketentuan
          </a>{" "}
          serta{" "}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Kebijakan Privasi
          </a>
          .
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-primary text-white font-title-lg text-title-lg rounded-lg hover:bg-primary-container active:scale-98 transition-all shadow-md disabled:opacity-50"
      >
        {loading ? "Memproses..." : "Daftar Sekarang"}
      </button>
    </form>
  );
}
