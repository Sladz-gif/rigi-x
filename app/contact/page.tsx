"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";
import { Mail, Phone, MapPin, Send, Check } from "lucide-react";

export default function ContactPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would send to a backend
    // For now, show success and provide WhatsApp/mailto options
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    const message = encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone}\n\n${formData.message}`
    );
    const mailto = `mailto:${siteConfig.emailAdmin}?subject=${encodeURIComponent(formData.subject)}&body=${message}`;

    return (
      <>
        <Header />
        <main id="main-content">
          <Section>
            <Container>
              <div className="max-w-2xl mx-auto text-center">
                <div className="w-20 h-20 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10 text-brand" />
                </div>
                <h1 className="text-3xl font-bold text-ink mb-4">Message Sent!</h1>
                <p className="text-lg text-muted mb-8">
                  Thank you for contacting us. You can also reach us directly via WhatsApp or email.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href={`https://wa.me/${siteConfig.whatsappNumber}?text=${message}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="lg">
                      Send via WhatsApp
                    </Button>
                  </a>
                  <a href={mailto}>
                    <Button size="lg" variant="outline">
                      <Mail className="w-4 h-4 mr-2" />
                      Email us
                    </Button>
                  </a>
                </div>
              </div>
            </Container>
          </Section>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main id="main-content">
        <Section>
          <Container>
            <SectionHeading
              title="Contact Us"
              subtitle="Get in touch with the Rigi-X team"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Contact Cards */}
              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-line p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-mist flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-brand" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink mb-1">Admin</h3>
                      <a
                        href={`tel:${siteConfig.phoneFormatted}`}
                        className="text-muted hover:text-brand"
                      >
                        {siteConfig.phoneAdmin}
                      </a>
                      <a
                        href={`mailto:${siteConfig.emailAdmin}`}
                        className="block text-muted hover:text-brand"
                      >
                        {siteConfig.emailAdmin}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-line p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-mist flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-brand" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink mb-1">Support</h3>
                      <a
                        href={`tel:${siteConfig.phoneSupport.replace(/\s/g, "")}`}
                        className="text-muted hover:text-brand"
                      >
                        {siteConfig.phoneSupport}
                      </a>
                      <a
                        href={`mailto:${siteConfig.emailSupport}`}
                        className="block text-muted hover:text-brand"
                      >
                        {siteConfig.emailSupport}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-line p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-mist flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-brand" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink mb-1">Careers</h3>
                      <a
                        href={`mailto:${siteConfig.emailCareers}`}
                        className="text-muted hover:text-brand"
                      >
                        {siteConfig.emailCareers}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-line p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-mist flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-brand" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink mb-1">Head Office</h3>
                      <p className="text-muted">{siteConfig.address}</p>
                      <p className="text-muted text-sm mt-1">
                        Digital address: {siteConfig.digitalAddress}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-line p-6">
                  <h3 className="font-semibold text-ink mb-2">Opening Hours</h3>
                  <p className="text-muted">
                    {siteConfig.openingHours}
                  </p>
                  <p className="text-xs text-muted mt-2">
                    * NOTE: placeholder - confirm with client
                  </p>
                </div>
              </div>

              {/* Contact Form */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl border border-line p-6 md:p-8">
                  <h2 className="text-2xl font-bold text-ink mb-6">Send us a message</h2>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-ink mb-2">
                          Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg border border-line bg-mist text-ink focus:outline-none focus:border-brand"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-ink mb-2">
                          Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-lg border border-line bg-mist text-ink focus:outline-none focus:border-brand"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-2">
                        Phone (optional)
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg border border-line bg-mist text-ink focus:outline-none focus:border-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-2">
                        Subject *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg border border-line bg-mist text-ink focus:outline-none focus:border-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-2">
                        Message *
                      </label>
                      <textarea
                        required
                        rows={5}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg border border-line bg-mist text-ink focus:outline-none focus:border-brand resize-none"
                      />
                    </div>
                    <Button type="submit" size="lg" className="w-full">
                      <Send className="w-4 h-4 mr-2" />
                      Send message
                    </Button>
                  </form>
                </div>

                {/* Map */}
                <div className="mt-8 rounded-2xl overflow-hidden border border-line">
                  <iframe
                    src={`https://www.google.com/maps?q=${encodeURIComponent(siteConfig.mapQuery)}&output=embed`}
                    width="100%"
                    height="400"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <div className="text-center mt-4">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(siteConfig.mapQuery)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand hover:underline text-sm"
                  >
                    Open in Google Maps
                  </a>
                </div>
              </div>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  );
}
