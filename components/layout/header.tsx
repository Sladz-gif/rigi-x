"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Phone, MessageCircle } from "lucide-react";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      setIsMobileMenuOpen(false);
      prevPathnameRef.current = pathname;
    }
  }, [pathname]);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/cars", label: "Cars" },
    { href: "/services", label: "Services" },
    { href: "/about", label: "About" },
    { href: "/faqs", label: "FAQs" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white shadow-md"
            : pathname === "/"
            ? "bg-transparent"
            : "bg-white"
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Logo isScrolled={isScrolled} pathname={pathname} />

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors hover:text-brand relative ${
                    pathname === link.href ? "text-brand" : "text-ink"
                  }`}
                >
                  {link.label}
                  {pathname === link.href && (
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-brand" />
                  )}
                </Link>
              ))}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-4">
              <a
                href={`tel:${siteConfig.phoneFormatted}`}
                className="text-sm font-medium text-ink hover:text-brand transition-colors"
              >
                {siteConfig.phone}
              </a>
              <Link href="/book">
                <Button size="sm">Book now</Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -mr-2 text-ink hover:text-brand"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <Logo isScrolled={true} pathname={pathname} />
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 -mr-2 text-ink hover:text-brand"
                aria-label="Close menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex flex-col gap-4 mb-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-lg font-medium py-2 border-b border-line ${
                    pathname === link.href ? "text-brand" : "text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex flex-col gap-4">
              <Link href="/book">
                <Button size="lg" className="w-full">
                  Book now
                </Button>
              </Link>
              <a
                href={`tel:${siteConfig.phoneFormatted}`}
                className="flex items-center gap-2 text-ink hover:text-brand"
              >
                <Phone className="w-5 h-5" />
                {siteConfig.phone}
              </a>
              <a
                href={`https://wa.me/${siteConfig.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-ink hover:text-brand"
              >
                <MessageCircle className="w-5 h-5 text-whatsapp" />
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
