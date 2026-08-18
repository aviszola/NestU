"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import Footer from "@/components/layout/Footer";

const CHANNELS = [
  {
    icon: "mail",
    title: "Email",
    desc: "hello@netsu.id",
    note: "Kami membalas dalam 1×24 jam kerja.",
    href: "mailto:hello@netsu.id",
  },
  {
    icon: "chat",
    title: "WhatsApp",
    desc: "Konsultasi cepat dengan tim NestU",
    note: "Respons dalam jam kerja (Seninâ€“Jumat, 09.00â€“17.00 WIB).",
    href: "https://wa.me/6281234567890",
  },
  {
    icon: "location_on",
    title: "Kantor",
    desc: "Jakarta, Indonesia",
    note: "Kunjungan hanya dengan janji temu.",
    href: "#",
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Kirim via mailto — tanpa backend, cukup buka aplikasi email user.
    const subject = encodeURIComponent(`[NestU] Pesan dari ${form.name}`);
    const body = encodeURIComponent(`${form.message}\n\n---\nDari: ${form.name} <${form.email}>`);
    window.location.href = `mailto:hello@netsu.id?subject=${subject}&body=${body}`;
    setSent(true);
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-outline-variant/20">
        <div className="max-w-7xl mx-auto px-4 md:px-10">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <Logo variant="full" className="h-12 w-auto text-primary" />
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/kos" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200">
                Cari Kos
              </Link>
              <Link href="/about" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200">
                Tentang Kami
              </Link>
              <Link href="/contact" className="text-sm font-semibold text-primary transition-colors duration-200">
                Bantuan
              </Link>
            </nav>
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login" className="px-5 py-2.5 text-sm font-semibold text-primary rounded-full hover:bg-primary/10 transition-all duration-200">
                Login
              </Link>
              <Link href="/register" className="px-5 py-2.5 text-sm font-semibold text-on-primary bg-primary rounded-full hover:opacity-90 active:scale-95 transition-all duration-200">
                Register
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="pt-16">
        <div className="max-w-4xl mx-auto px-4 md:px-10 py-12 md:py-16">
          <p className="text-label-md font-bold text-primary uppercase tracking-widest mb-3">
            Bantuan
          </p>
          <h1 className="font-headline-lg text-headline-lg md:text-4xl font-bold text-on-surface mb-4">
            Hubungi Kami
          </h1>
          <p className="text-body-md text-on-surface-variant mb-10">
            Punya pertanyaan tentang booking, pembayaran, atau akun? Tim kami siap membantu.
          </p>

          {/* Channel kontak */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-10">
            {CHANNELS.map((c) =>
              c.href ? (
                <a
                  key={c.title}
                  href={c.href}
                  target={c.href.startsWith("http") ? "_blank" : undefined}
                  rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 hover:shadow-lg transition-shadow block"
                >
                  <div className="w-11 h-11 bg-primary-container rounded-full flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-on-primary-container">
                      {c.icon}
                    </span>
                  </div>
                  <h3 className="font-title-lg text-title-lg font-bold text-on-surface mb-1">
                    {c.title}
                  </h3>
                  <p className="text-body-sm text-on-surface font-semibold">{c.desc}</p>
                  <p className="text-[11px] text-on-surface-variant mt-2 leading-relaxed">{c.note}</p>
                </a>
              ) : (
                <div
                  key={c.title}
                  className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 block"
                >
                  <div className="w-11 h-11 bg-primary-container rounded-full flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-on-primary-container">
                      {c.icon}
                    </span>
                  </div>
                  <h3 className="font-title-lg text-title-lg font-bold text-on-surface mb-1">
                    {c.title}
                  </h3>
                  <p className="text-body-sm text-on-surface font-semibold">{c.desc}</p>
                  <p className="text-[11px] text-on-surface-variant mt-2 leading-relaxed">{c.note}</p>
                </div>
              )
            )}
          </div>

          {/* Form kontak */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 p-8 shadow-[0_4px_20px_rgba(30,58,138,0.05)]">
            <h2 className="font-headline-md text-headline-md font-bold text-primary mb-2">
              Kirim Pesan
            </h2>
            <p className="text-body-sm text-on-surface-variant mb-6">
              Tim kami akan membalas pesan kamu melalui email.
            </p>
            {sent && (
              <div className="mb-6 rounded-lg bg-secondary/10 text-secondary px-4 py-3 text-sm font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Aplikasi email akan terbuka â€” selesaikan pengiriman di sana.
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="contact-name" className="block text-label-md font-bold text-on-surface mb-1.5">
                  Nama
                </label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nama lengkap"
                  className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-colors text-body-md"
                />
              </div>
              <div>
                <label htmlFor="contact-email" className="block text-label-md font-bold text-on-surface mb-1.5">
                  Email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@contoh.com"
                  className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-colors text-body-md"
                />
              </div>
              <div>
                <label htmlFor="contact-message" className="block text-label-md font-bold text-on-surface mb-1.5">
                  Pesan
                </label>
                <textarea
                  id="contact-message"
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Tulis pertanyaan atau kendala kamu..."
                  className="w-full px-4 py-3 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-colors text-body-md resize-y"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 text-sm font-semibold text-on-primary bg-primary rounded-full hover:opacity-90 active:scale-95 transition-all duration-200"
              >
                Kirim Pesan
              </button>
            </form>
          </div>
        </div>
      </section>
          <Footer />
    </>
  );
}
