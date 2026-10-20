"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, ArrowUp } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export function WhatsAppButton() {
  const [scrolled, setScrolled] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const pathname = usePathname();

  // Hide on book, contact, and car detail pages
  const isHidden = pathname === "/book" || pathname === "/contact" || pathname.startsWith("/cars/");

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 300);
      setShowScrollTop(window.scrollY > 500);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (isHidden) return null;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
      {/* Scroll to Top */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="w-12 h-12 rounded-full bg-ink text-white flex items-center justify-center shadow-lg hover:bg-ink-soft transition-colors"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* WhatsApp */}
      <a
        href={`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(
          siteConfig.whatsappMessage
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-2 rounded-full bg-whatsapp text-white shadow-lg hover:opacity-90 transition-opacity",
          "md:w-auto md:px-5 md:py-3",
          "w-14 h-14 justify-center",
          scrolled && "md:w-14 md:px-0 md:justify-center"
        )}
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle className="w-6 h-6 flex-shrink-0" />
        <span className={cn("font-medium", scrolled && "md:hidden")}>
          Chat with us
        </span>
      </a>
    </div>
  );
}
