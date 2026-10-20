import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { X as TwitterIcon, Mail, Phone, MapPin, Share2 } from "lucide-react";

export function Footer() {
  const currentYear = 2026;

  return (
    <footer className="bg-ink text-paper">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-bold mb-4">Rigi-X</h3>
            <p className="text-muted text-sm mb-6">
              Premium car rentals at everyday prices. Self-drive or chauffeur-driven
              vehicles across Accra.
            </p>
            <div className="flex gap-4">
              <a
                href={siteConfig.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-brand transition-colors"
                aria-label="Instagram"
              >
                <Share2 className="w-5 h-5" />
              </a>
              <a
                href={siteConfig.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-brand transition-colors"
                aria-label="Facebook"
              >
                <Share2 className="w-5 h-5" />
              </a>
              <a
                href={siteConfig.social.x}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-brand transition-colors"
                aria-label="X (Twitter)"
              >
                <TwitterIcon className="w-5 h-5" />
              </a>
              <a
                href={siteConfig.social.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-brand transition-colors"
                aria-label="TikTok"
              >
                <Share2 className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold mb-4">Services</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <Link
                  href="/services/self-drive"
                  className="hover:text-brand transition-colors"
                >
                  Luxury Rental
                </Link>
              </li>
              <li>
                <Link
                  href="/services/chauffeur-driven"
                  className="hover:text-brand transition-colors"
                >
                  Business Rentals
                </Link>
              </li>
              <li>
                <Link
                  href="/services/airport-transfer"
                  className="hover:text-brand transition-colors"
                >
                  Airport Pickups
                </Link>
              </li>
              <li>
                <Link
                  href="/services/self-drive"
                  className="hover:text-brand transition-colors"
                >
                  Safari Rentals
                </Link>
              </li>
            </ul>
          </div>

          {/* Useful Links */}
          <div>
            <h4 className="font-semibold mb-4">Useful Links</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <Link href="/about" className="hover:text-brand transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/rental-requirements"
                  className="hover:text-brand transition-colors"
                >
                  Rental Requirements
                </Link>
              </li>
              <li>
                <Link href="/membership" className="hover:text-brand transition-colors">
                  Membership
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-brand transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Visit Us */}
          <div>
            <h4 className="font-semibold mb-4">Visit Us</h4>
            <ul className="space-y-3 text-sm text-muted">
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{siteConfig.address}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-xs font-semibold">GA-122-1897</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <a
                  href={`tel:${siteConfig.phoneFormatted}`}
                  className="hover:text-brand transition-colors"
                >
                  {siteConfig.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <a
                  href={`mailto:${siteConfig.emailAdmin}`}
                  className="hover:text-brand transition-colors"
                >
                  {siteConfig.emailAdmin}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <div className="border-t border-line pt-8 mb-8">
          <div className="max-w-md mx-auto">
            <h4 className="font-semibold mb-4 text-center">Subscribe to our newsletter</h4>
            <form className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 rounded-full border border-line bg-ink-soft text-paper placeholder:text-muted focus:outline-none focus:border-brand"
                required
              />
              <button
                type="submit"
                className="px-6 py-2 rounded-full bg-brand text-white font-medium hover:bg-brand-dark transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-line pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted">
          <p>
            © {currentYear} Rigi-X. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="/privacy-policy"
              className="hover:text-brand transition-colors"
            >
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-brand transition-colors">
              Terms
            </Link>
            <span className="text-xs">*Promo T&Cs apply</span>
          </div>
          <p className="text-xs">
            Photos by Unsplash contributors
          </p>
        </div>
      </div>
    </footer>
  );
}
