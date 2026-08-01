"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"siswa" | "pemilik">("siswa");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role, full_name: name },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/login");
    return;
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-surface">
      <div className="flex w-full max-w-4xl mx-4 min-h-[600px] rounded-2xl overflow-hidden card-shadow">
        {/* Branding Panel */}
        <div className="hidden md:flex md:w-1/2 bg-primary relative items-center justify-center p-8">
          <div className="relative z-10 text-center">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-3xl text-white">home</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">NetsU</h2>
            <p className="text-white/70 text-sm leading-relaxed max-w-xs mx-auto">
              Temukan kos terbaik untuk perjalanan akademik Anda. Bergabung dengan ribuan mahasiswa lainnya.
            </p>
            <div className="mt-8 flex gap-2 justify-center">
              <div className="w-2 h-2 rounded-full bg-white/60" />
              <div className="w-2 h-2 rounded-full bg-white/30" />
              <div className="w-2 h-2 rounded-full bg-white/30" />
            </div>
          </div>
        </div>

        {/* Form Panel */}
        <div className="w-full md:w-1/2 bg-surface-container-lowest p-8 flex flex-col justify-center">
          <div className="max-w-sm mx-auto w-full">
            <h1 className="font-headline-lg text-headline-lg text-on-surface mb-1">Daftar</h1>
            <p className="text-on-surface-variant font-body-md mb-6">Buat akun baru untuk mulai menjelajah</p>

            {error && (
              <div className="mb-4 rounded-lg bg-error/10 border border-error/20 text-error p-3 text-sm font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="name" className="block font-label-md text-label-md text-on-surface-variant mb-1">
                  Nama Lengkap
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Masukkan nama lengkap"
                  className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface font-body-md text-body-md focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none text-on-surface placeholder:text-outline"
                />
              </div>

              <div>
                <label htmlFor="reg-email" className="block font-label-md text-label-md text-on-surface-variant mb-1">
                  Email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contoh@email.com"
                  className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface font-body-md text-body-md focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none text-on-surface placeholder:text-outline"
                />
              </div>

              <div>
                <label htmlFor="reg-password" className="block font-label-md text-label-md text-on-surface-variant mb-1">
                  Password
                </label>
                <input
                  id="reg-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 karakter"
                  className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface font-body-md text-body-md focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none text-on-surface placeholder:text-outline"
                />
              </div>

              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2">
                  Daftar sebagai
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("siswa")}
                    className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                      role === "siswa"
                        ? "bg-primary text-on-primary shadow-sm"
                        : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container"
                    }`}
                  >
                    Siswa
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("pemilik")}
                    className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                      role === "pemilik"
                        ? "bg-primary text-on-primary shadow-sm"
                        : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container"
                    }`}
                  >
                    Pemilik Kos
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-primary text-on-primary font-bold shadow-md hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? "Memproses..." : "Daftar"}
              </button>
            </form>

            <p className="text-center font-body-sm text-body-sm text-outline mt-6">
              Sudah punya akun?{" "}
              <a href="/login" className="text-primary font-bold hover:underline">
                Login
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
