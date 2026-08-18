"use client";

import { Suspense } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getRoleHome } from "@/lib/constants/routes";
import RegisterForm from "@/components/RegisterForm";

/** Inner component — pakai useSearchParams, wajib dibungkus Suspense. */
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const redirectTarget = searchParams.get("redirect");
  const justRegistered = searchParams.get("registered") === "true";

  // Toggle Login/Register
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // ── Login state ──
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  async function redirectByRole(userId: string) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    const target = redirectTarget || getRoleHome(profile?.role);
    router.push(target);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) throw error;
      if (!data.user) throw new Error("Login gagal");
      await redirectByRole(data.user.id);
      router.refresh();
    } catch (err: any) {
      setLoginError(err.message || "Gagal masuk, silakan coba lagi.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoginError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err: any) {
      setLoginError(err.message);
    }
  }

  async function handleFacebookLogin() {
    setLoginError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err: any) {
      setLoginError(err.message);
    }
  }

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-background" suppressHydrationWarning>
      {/* ─── Left Side — Branding ─── */}
      <section className="hidden md:flex md:w-1/2 relative overflow-hidden bg-primary items-center justify-center p-margin-desktop">
        <div className="absolute inset-0 z-0">
          <div
            className="w-full h-full bg-cover bg-center opacity-70"
            style={{
              backgroundImage: "url(/images/hero-student.jpg)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-primary via-primary/40 to-transparent" />
        </div>
        <div className="relative z-10 max-w-lg text-white">
          <div className="mb-stack-lg">
            <span className="inline-block px-4 py-1 rounded-full glass-effect font-label-md text-label-md mb-stack-sm">
              Academic Reliability & Community Warmth
            </span>
            <h1 className="font-display-lg text-display-lg mb-stack-md leading-tight">
              NestU
            </h1>
            <p className="font-body-lg text-body-lg text-primary-fixed opacity-90">
              Temukan hunian yang aman, nyaman, dan mendukung perjalanan
              akademismu. Platform terintegrasi untuk siswa, pemilik kos, dan
              sekolah.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-gutter">
            <div className="glass-effect p-stack-md rounded-xl">
              <span className="material-symbols-outlined text-secondary-fixed mb-2">
                verified_user
              </span>
              <h3 className="font-title-lg text-title-lg text-white">
                Terverifikasi
              </h3>
              <p className="font-body-sm text-body-sm text-white/80">
                Semua hunian telah melalui kurasi ketat tim NestU.
              </p>
            </div>
            <div className="glass-effect p-stack-md rounded-xl">
              <span className="material-symbols-outlined text-secondary-fixed mb-2">
                payments
              </span>
              <h3 className="font-title-lg text-title-lg text-white">
                Transparan
              </h3>
              <p className="font-body-sm text-body-sm text-white/80">
                Sistem pembayaran aman dan tanpa biaya tersembunyi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Right Side — Form ─── */}
      <section className="flex-1 flex flex-col items-center justify-center p-margin-mobile md:p-margin-desktop bg-surface relative">
        <div className="w-full max-w-md">
          {/* Logo Mobile */}
          <div className="md:hidden mb-stack-lg flex items-center justify-center">
            <Logo variant="full" className="h-16 w-auto text-primary" />
          </div>

          {/* Toggle Masuk / Daftar */}
          <div className="flex p-1 bg-surface-container-low rounded-xl mb-stack-lg">
            <button
              onClick={() => setActiveTab("login")}
              className={`flex-1 py-2 font-label-md text-label-md rounded-lg transition-all ${
                activeTab === "login"
                  ? "bg-surface text-primary shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              Masuk
            </button>
            <button
              onClick={() => setActiveTab("register")}
              className={`flex-1 py-2 font-label-md text-label-md rounded-lg transition-all ${
                activeTab === "register"
                  ? "bg-surface text-primary shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              Daftar
            </button>
          </div>

          {/* ═══ LOGIN FORM ═══ */}
          <div
            className={`form-transition ${
              activeTab === "login" ? "visible-section" : "hidden-section"
            }`}
          >
            {(redirectTarget || justRegistered) && (
              <div className="mb-4 rounded-lg bg-secondary/10 border border-secondary/20 text-secondary px-4 py-3 text-sm font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">info</span>
                {justRegistered
                  ? "Akun berhasil dibuat! Silakan cek email untuk verifikasi, lalu masuk."
                  : "Silakan login terlebih dahulu untuk mengakses halaman ini."}
              </div>
            )}

            <div className="mb-stack-lg text-center md:text-left">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-2">
                Selamat Datang Kembali
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Silakan masukkan detail akun Anda untuk melanjutkan.
              </p>
            </div>

            {loginError && (
              <div className="mb-4 p-3 rounded-lg bg-error-container/20 border border-error/20 text-xs text-error">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-stack-sm">
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1">
                  Alamat Email
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="nama@email.com"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all bg-white text-sm text-on-surface placeholder-outline"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-label-md text-label-md text-on-surface-variant">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-primary font-label-md text-label-md hover:underline"
                  >
                    Lupa Password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-3 pr-10 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all bg-white text-sm text-on-surface placeholder-outline"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowLoginPassword(!showLoginPassword)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-primary"
                  >
                    <span className="material-symbols-outlined">
                      {showLoginPassword ? "visibility" : "visibility_off"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary"
                />
                <label
                  htmlFor="remember"
                  className="font-body-sm text-body-sm text-on-surface-variant"
                >
                  Ingat saya
                </label>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 bg-primary text-white font-title-lg text-title-lg rounded-lg hover:bg-primary-container active:scale-98 transition-all shadow-md disabled:opacity-50"
              >
                {loginLoading ? (
                  <span className="material-symbols-outlined animate-spin">
                    progress_activity
                  </span>
                ) : (
                  "Masuk ke Akun"
                )}
              </button>
            </form>

            {/* Social Login */}
            <div className="mt-stack-lg">
              <div className="relative flex items-center mb-stack-md">
                <div className="flex-grow border-t border-outline-variant" />
                <span className="flex-shrink mx-4 font-label-md text-label-md text-outline">
                  Atau masuk dengan
                </span>
                <div className="flex-grow border-t border-outline-variant" />
              </div>
              <div className="grid grid-cols-2 gap-gutter">
                <button
                  onClick={handleGoogleLogin}
                  className="flex items-center justify-center space-x-2 py-2 px-4 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" fill="#FFC107"/>
                    <path d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" fill="#FF3D00"/>
                    <path d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" fill="#4CAF50"/>
                    <path d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" fill="#1976D2"/>
                  </svg>
                  <span className="font-label-md text-label-md">Google</span>
                </button>
                <button
                  onClick={handleFacebookLogin}
                  className="flex items-center justify-center space-x-2 py-2 px-4 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 4C12.954 4 4 12.954 4 24c0 9.968 7.316 18.222 16.875 19.72V29.766h-5.08V24h5.08v-4.41c0-5.013 2.985-7.783 7.555-7.783 2.19 0 4.48.39 4.48.39v4.922h-2.524c-2.485 0-3.261 1.543-3.261 3.126V24h5.55l-.887 5.766h-4.663v13.954C36.684 42.222 44 33.968 44 24 44 12.954 35.046 4 24 4z" fill="#1877F2"/>
                    <path d="M30.836 29.766L31.723 24h-5.55v-3.646c0-1.583.776-3.126 3.261-3.126h2.524V12.306s-2.29-.39-4.48-.39c-4.57 0-7.555 2.77-7.555 7.783V24h-5.08v5.766h5.08v13.954a20.196 20.196 0 006.25 0V29.766h4.663z" fill="white"/>
                  </svg>
                  <span className="font-label-md text-label-md">Facebook</span>
                </button>
              </div>
            </div>
          </div>

          {/* ═══ REGISTER FORM — shared component ═══ */}
          <div
            className={`form-transition ${
              activeTab === "register" ? "visible-section" : "hidden-section"
            }`}
          >
            <div className="mb-stack-md text-center md:text-left">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-2">
                Buat Akun Baru
              </h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Bergabunglah dengan ekosistem NestU hari ini.
              </p>
            </div>
            <RegisterForm onSuccess={() => setActiveTab("login")} />
          </div>

          {/* Footer Links */}
          <div className="mt-stack-lg text-center">
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Ada kendala?{" "}
              <Link
                href="/contact"
                className="text-primary font-semibold hover:underline"
              >
                Hubungi Support
              </Link>
            </p>
            <p className="font-label-md text-label-md text-outline mt-4">
              &copy; 2024 NestU. Academic Reliability &
              Community Warmth.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
