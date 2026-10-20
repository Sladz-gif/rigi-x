"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { FAQAccordion } from "@/components/forms/faq-accordion";
import { faqs } from "@/data/faqs";
import { Search, MessageCircle } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

export default function FAQsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const categories = ["All", "Booking", "Requirements", "Payments", "Insurance", "Fuel", "Cancellations"];

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <Header />
      <main id="main-content">
        <Section>
          <Container>
            <SectionHeading
              title="Frequently Asked Questions"
              subtitle="Find answers to common questions about our services"
            />

            {/* Search */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-full border border-line bg-mist text-ink focus:outline-none focus:border-brand"
                />
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 mb-8 justify-center">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? "bg-brand text-white"
                      : "bg-mist text-ink hover:bg-line"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* FAQ List */}
            <div className="max-w-3xl mx-auto">
              {filteredFaqs.length > 0 ? (
                <FAQAccordion faqs={filteredFaqs} />
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted">No questions match your search.</p>
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="text-center mt-12">
              <p className="text-muted mb-4">Still have questions?</p>
              <a
                href={`https://wa.me/${siteConfig.whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <button className="flex items-center gap-2 mx-auto bg-whatsapp text-white px-6 py-3 rounded-full font-medium hover:opacity-90 transition-opacity">
                  <MessageCircle className="w-5 h-5" />
                  Chat on WhatsApp
                </button>
              </a>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
