import Logo from "@/components/ui/Logo";
import Link from "next/link";

interface FooterProps {
  brandName: string;
  tagline?: string;
  showPartnerSection?: boolean;
}

export default function Footer({
  brandName,
  tagline,
  showPartnerSection = false,
}: FooterProps) {
  return (
    <footer className="border-t border-outline-variant bg-surface px-6 md:px-8 py-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Brand */}
        <div>
            <div className="flex items-center gap-2">
              <Logo variant="full" className="h-11 w-auto text-primary" />
            </div>
          {tagline && (
            <p className="text-xs text-outline leading-relaxed max-w-xs">
              {tagline}
            </p>
          )}
          <p className="text-[10px] text-on-surface-variant mt-3">
            &copy; {new Date().getFullYear()} {brandName}. All rights reserved.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-xs font-semibold text-on-surface uppercase tracking-wider mb-3">
            Quick Links
          </h4>
          <ul className="space-y-2">
            <li>
              <Link href="/about" className="text-xs text-outline hover:text-on-surface transition-colors">
                About Us
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-xs text-outline hover:text-on-surface transition-colors">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-xs text-outline hover:text-on-surface transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/contact" className="text-xs text-outline hover:text-on-surface transition-colors">
                Contact Support
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 3 — Partners or Documentation */}
        <div>
          {showPartnerSection ? (
            <>
              <h4 className="text-xs font-semibold text-on-surface uppercase tracking-wider mb-3">
                Partner with Us
              </h4>
              <p className="text-xs text-outline leading-relaxed mb-3">
                Trusted by 50+ Schools nationwide.
              </p>
              <a
                href="#"
                className="inline-block px-4 py-2 bg-primary text-on-primary text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Become a Partner
              </a>
            </>
          ) : (
            <>
              <h4 className="text-xs font-semibold text-on-surface uppercase tracking-wider mb-3">
                Documentation
              </h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-xs text-outline hover:text-on-surface transition-colors">
                    API Reference
                  </a>
                </li>
                <li>
                  <a href="#" className="text-xs text-outline hover:text-on-surface transition-colors">
                    Integration Guide
                  </a>
                </li>
              </ul>
              <p className="text-xs text-on-surface-variant mt-4">
                &copy; {new Date().getFullYear()} {brandName}. All rights reserved.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-outline-variant text-center">
        <p className="text-[10px] text-outline">
          Built with care for better student living.
        </p>
      </div>
    </footer>
  );
}
