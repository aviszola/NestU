"use client";

import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Gagal mengirim email reset. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-background" suppressHydrationWarning>
      {/* ─── Left Side — Branding (sama dengan login) ─── */}
      <section className="hidden md:flex md:w-1/2 relative overflow-hidden bg-primary items-center justify-center p-margin-desktop">
        <div className="absolute inset-0 z-0">
          <div
            className="w-full h-full bg-cover bg-center opacity-70"
            style={{ backgroundImage: "url(/images/hero-student.jpg)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-primary via-primary/40 to-transparent" />
        </div>
        <div className="relative z-10 max-w-lg text-white">
          <div className="mb-stack-lg">
            <span className="inline-block px-4 py-1 rounded-full glass-effect font-label-md text-label-md mb-stack-sm">
              Academic Reliability & Community Warmth
            </span>
            <h1 className="font-display-lg text-display-lg mb-stack-md leading-tight">NestU</h1>
            <p className="font-body-lg text-body-lg text-primary-fixed opacity-90">
              Temukan hunian yang aman, nyaman, dan mendukung perjalanan
              akademismu. Platform terintegrasi untuk siswa, pemilik kos, dan
              sekolah.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Right Side — Form ─── */}
      <section className="flex-1 flex flex-col items-center justify-center p-margin-mobile md:p-margin-desktop bg-surface relative">
        <div className="w-full max-w-md">
          <div className="md:hidden mb-stack-lg flex items-center justify-center">
            <Logo variant="full" className="h-16 w-auto text-primary" />
          </div>

          <div className="mb-stack-lg text-center md:text-left">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-2">
              Lupa Password
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Masukkan email terdaftar — kami akan kirim tautan untuk mengatur ulang password kamu.
            </p>
          </div>

          {sent ? (
            <div className="rounded-lg bg-secondary/10 border border-secondary/20 p-6 text-center">
              <span className="material-symbols-outlined text-secondary text-4xl block mb-2">mark_email_read</span>
              <h3 className="font-title-lg text-title-lg font-bold text-on-surface mb-1">
                Email terkirim
              </h3>
              <p className="text-body-sm text-on-surface-variant">
                Cek kotak masuk <span className="font-semibold">{email}</span> untuk tautan reset password.
              </p>
              <Link
                href="/login"
                className="inline-block mt-4 text-primary font-label-md text-label-md hover:underline"
              >
                Kembali ke halaman masuk
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-stack-sm">
              {error && (
                <div className="p-3 rounded-lg bg-error-container/20 border border-error/20 text-xs text-error">
                  {error}
                </div>
              )}
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1">
                  Alamat Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all bg-white text-sm text-on-surface placeholder-outline"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary text-white font-title-lg text-title-lg rounded-lg hover:bg-primary-container active:scale-98 transition-all shadow-md disabled:opacity-50"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                ) : (
                  "Kirim Tautan Reset"
                )}
              </button>

              <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
                Ingat password kamu?{" "}
                <Link href="/login" className="text-primary font-semibold hover:underline">
                  Masuk di sini
                </Link>
              </p>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
