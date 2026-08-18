import RegisterForm from "@/components/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-surface">
      <div className="flex w-full max-w-4xl mx-4 min-h-[600px] rounded-2xl overflow-hidden card-shadow">
        {/* Branding Panel */}
        <div className="hidden md:flex md:w-1/2 bg-primary relative items-center justify-center p-8">
          <div className="relative z-10 text-center">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-3xl text-white">home</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">NestU</h2>
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

            <RegisterForm />

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
