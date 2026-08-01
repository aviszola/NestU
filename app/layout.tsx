import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NetsU",
  description:
    "Platform pencarian dan pengelolaan kos untuk siswa dan mahasiswa.",
  openGraph: {
    title: "NetsU",
    description:
      "Platform pencarian dan pengelolaan kos untuk siswa dan mahasiswa.",
    type: "website",
    locale: "id_ID",
    siteName: "NetsU",
  },
  twitter: {
    card: "summary_large_image",
    title: "NetsU",
    description:
      "Platform pencarian dan pengelolaan kos untuk siswa dan mahasiswa.",
  },
  icons: {
    icon: "/images/logo-full.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#00236F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}<Toaster position="top-right" richColors={false} /></body>
    </html>
  );
}
