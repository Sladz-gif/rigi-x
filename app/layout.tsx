import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  style: "italic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rigi-X - Premium Car Rentals in Accra, Ghana",
  description: "Premium car rentals at everyday prices. Self-drive or chauffeur-driven vehicles across Accra. Transparent pricing, no hidden fees.",
  keywords: ["car rental", "Accra", "Ghana", "self-drive", "chauffeur", "luxury cars", "SUV", "sedan"],
  authors: [{ name: "Rigi-X" }],
  openGraph: {
    title: "Rigi-X - Premium Car Rentals in Accra, Ghana",
    description: "Premium car rentals at everyday prices. Self-drive or chauffeur-driven vehicles across Accra.",
    url: "https://rigi-x.com",
    siteName: "Rigi-X",
    locale: "en_GH",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans antialiased">
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        <div className="flex flex-col min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
