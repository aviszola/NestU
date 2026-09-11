import type { Metadata } from "next";
import { SITE_URL, SITE_NAME, OG_DEFAULT_IMAGE } from "@/lib/seo";

// ── Profil pengembang ──
// URL di bawah SATU-SATUNYA tempat untuk menukar link profil.
// GitHub sudah terverifikasi (github.com/aviszola). Ganti LINKEDIN_URL
// dengan profil LinkedIn asli Anda sebelum/atau segera setelah deploy.
const DEVELOPER_NAME = "Avis Zola Raditya Kurniawan";
const DEVELOPER_GITHUB_URL = "https://github.com/aviszola";
const DEVELOPER_LINKEDIN_URL = "https://www.linkedin.com/in/avis-zola-raditya-kurniawan-407388377/";
const DEVELOPER_JOB_TITLE = "Full-Stack Developer & Founder";

const DEVELOPER_PAGE_URL = `${SITE_URL}/developer`;
const DEVELOPER_SOCIAL_LINKS = [DEVELOPER_GITHUB_URL, DEVELOPER_LINKEDIN_URL];

const DEVELOPER_DESCRIPTION =
  "Avis Zola Raditya Kurniawan adalah pengembang di balik NestU, platform pencarian dan pengelolaan kos untuk pelajar dan mahasiswa di Indonesia.";

export const metadata: Metadata = {
  title: `${DEVELOPER_NAME} — Pengembang NestU`,
  description: DEVELOPER_DESCRIPTION,
  alternates: { canonical: DEVELOPER_PAGE_URL },
  openGraph: {
    title: `${DEVELOPER_NAME} — Pengembang NestU | ${SITE_NAME}`,
    description: DEVELOPER_DESCRIPTION,
    url: DEVELOPER_PAGE_URL,
    type: "profile",
    locale: "id_ID",
    siteName: SITE_NAME,
    images: [{ url: OG_DEFAULT_IMAGE, width: 1200, height: 630, alt: `${DEVELOPER_NAME} — Pengembang NestU` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${DEVELOPER_NAME} — Pengembang NestU | ${SITE_NAME}`,
    description: DEVELOPER_DESCRIPTION,
    images: [OG_DEFAULT_IMAGE],
  },
};

export default function DeveloperPage() {
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: DEVELOPER_NAME,
    jobTitle: DEVELOPER_JOB_TITLE,
    worksFor: {
      "@type": "Organization",
      name: SITE_NAME,
    },
    url: DEVELOPER_PAGE_URL,
    sameAs: DEVELOPER_SOCIAL_LINKS,
  };

  return (
    <>
      {/* Hero / Profil */}
      <section className="pt-16 bg-gradient-to-b from-primary-container/30 to-surface">
        <div className="max-w-4xl mx-auto px-4 md:px-10 py-16 md:py-20 text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-primary-container flex items-center justify-center mb-6 shadow-md">
            <span className="material-symbols-outlined text-on-primary-container text-5xl">code</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg md:text-display-lg font-bold text-on-surface leading-tight">
            {DEVELOPER_NAME}
          </h1>
          <p className="font-title-lg text-title-lg text-primary font-semibold mt-2">
            {DEVELOPER_JOB_TITLE}
          </p>
          <p className="text-body-md text-on-surface-variant leading-relaxed max-w-2xl mx-auto mt-4">
            {DEVELOPER_DESCRIPTION}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <a
              href={DEVELOPER_GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-on-primary bg-primary rounded-full hover:opacity-90 active:scale-95 transition-all duration-200"
            >
              <span className="material-symbols-outlined text-[18px]">code</span>
              GitHub
            </a>
            <a
              href={DEVELOPER_LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-primary border border-primary rounded-full hover:bg-primary/10 transition-all duration-200"
            >
              <span className="material-symbols-outlined text-[18px]">workspaces</span>
              LinkedIn
            </a>
          </div>
        </div>
      </section>

      {/* Cerita Singkat */}
      <section className="max-w-3xl mx-auto px-4 md:px-10 py-14">
        <h2 className="font-headline-md text-headline-md font-bold text-on-surface text-center mb-8">
          Tentang Pengembang
        </h2>
        <div className="space-y-4 text-body-md text-on-surface-variant leading-relaxed">
          <p>
            {DEVELOPER_NAME} adalah pengembang di balik NestU — sebuah platform
            yang dibangun untuk menjawab satu pertanyaan sederhana: bagaimana
            pelajar dan mahasiswa di Indonesia bisa menemukan tempat tinggal
            yang aman, nyaman, dan terjangkau tanpa harus pusing membandingkan
            informasi yang tersebar di banyak tempat.
          </p>
          <p>
            Berbekal pengalaman sebagai full-stack developer, Avis merancang
            NestU dari nol — mulai dari basis data, autentikasi dan keamanan,
            hingga antarmuka yang ramah pengguna. Fokus utamanya adalah
            menciptakan ekosistem yang transparan: pemilik kos bisa menemukan
            penghuni yang tepat, dan pelajar bisa menemukan rumah kedua yang
            terpercaya.
          </p>
          <p>
            Proyek ini terus berkembang mengikuti kebutuhan penggunanya, dengan
            tekad untuk memanfaatkan teknologi agar pencarian kos menjadi lebih
            mudah, cepat, dan bisa diakses oleh sebanyak mungkin orang.
          </p>
        </div>
      </section>

      {/* Structured Data: Person */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />

    </>
  );
}

