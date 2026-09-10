import type { Metadata } from "next";
import { SITE_URL, OG_DEFAULT_IMAGE } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Hubungi Kami",
  description:
    "Ada pertanyaan atau butuh bantuan? Hubungi tim NestU via email, WhatsApp, atau isi formulir kontak. Kami siap membantu dalam 1×24 jam kerja.",
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: {
    title: "Hubungi Kami | NestU",
    description:
      "Ada pertanyaan atau butuh bantuan? Hubungi tim NestU via email, WhatsApp, atau isi formulir kontak. Kami siap membantu dalam 1×24 jam kerja.",
    url: `${SITE_URL}/contact`,
    images: [{ url: OG_DEFAULT_IMAGE, width: 1200, height: 630, alt: "Hubungi NestU" }],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
