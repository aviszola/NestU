import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import "./globals.css";
import { SITE_NAME, SITE_URL, OG_DEFAULT_IMAGE } from "@/lib/seo";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

const materialSymbols = localFont({
  src: "../public/fonts/material-symbols-outlined.ttf",
  variable: "--font-material-symbols",
  display: "block",
  weight: "100 700",
  style: "normal",
});

export const metadata: Metadata = {
  // Template: halaman spesifik akan override title, fallback ke "NestU"
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Platform pencarian kos terpercaya untuk siswa dan mahasiswa. Hunian terverifikasi, harga transparan, booking online mudah.",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${SITE_NAME} — Temukan Kos Impianmu`,
    description:
      "Platform pencarian kos terpercaya untuk siswa dan mahasiswa. Hunian terverifikasi, harga transparan, booking online mudah.",
    type: "website",
    locale: "id_ID",
    siteName: SITE_NAME,
    url: SITE_URL,
    images: [{ url: OG_DEFAULT_IMAGE, width: 1200, height: 630, alt: `${SITE_NAME} — Temukan Kos Impianmu` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Temukan Kos Impianmu`,
    description:
      "Platform pencarian kos terpercaya untuk siswa dan mahasiswa. Hunian terverifikasi, harga transparan, booking online mudah.",
    images: [OG_DEFAULT_IMAGE],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/images/logo-full.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "8uPRq3P4u3MfLYkybdwsAVP7GuPwoy8mxYFS6jS0ycc",
  },
};

export const viewport: Viewport = {
  themeColor: "#00236F",
};

/** JSON-LD WebSite + Organization — sinyal branding global untuk Google Search */
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      description:
        "Platform pencarian kos terpercaya untuk siswa dan mahasiswa. Hunian terverifikasi, harga transparan, booking online mudah.",
      inLanguage: "id-ID",
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/kos?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        "@id": `${SITE_URL}/#logo`,
        url: `${SITE_URL}/images/logo-full.svg`,
        contentUrl: `${SITE_URL}/images/logo-full.svg`,
        width: 1024,
        height: 672,
        caption: SITE_NAME,
      },
      image: { "@id": `${SITE_URL}/#logo` },
    },
  ],
};

import { Suspense } from "react";
import RouteProgressBar from "@/components/RouteProgressBar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${plusJakartaSans.variable} ${materialSymbols.variable} h-full antialiased`}
    >
      <head>
        {/* Fallback CDN Google Fonts Material Symbols — redundansi ganda jika font lokal tertunda */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Suspense fallback={null}>
          <RouteProgressBar />
        </Suspense>
        {children}
        <Toaster position="top-right" richColors={false} />
        {/* JSON-LD WebSite + Organization — global branding signal for Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </body>
    </html>
  );
}
