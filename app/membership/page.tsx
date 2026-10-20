import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Check, X, MessageCircle } from "lucide-react";
import { siteConfig } from "@/lib/site-config";
import { Accent } from "@/components/ui/accent";

export default function MembershipPage() {
  const tiers = [
    {
      name: "Silver",
      price: "NOTE: placeholder",
      discount: "5%",
      benefits: [
        { included: true, text: "5% discount on all rentals" },
        { included: true, text: "Priority booking (24h)" },
        { included: false, text: "Free vehicle upgrade" },
        { included: false, text: "Free delivery within Accra" },
        { included: false, text: "Dedicated account manager" },
      ],
    },
    {
      name: "Gold",
      price: "NOTE: placeholder",
      discount: "10%",
      benefits: [
        { included: true, text: "10% discount on all rentals" },
        { included: true, text: "Priority booking (12h)" },
        { included: true, text: "Free vehicle upgrade (once/month)" },
        { included: true, text: "Free delivery within Accra" },
        { included: false, text: "Dedicated account manager" },
      ],
      popular: true,
    },
    {
      name: "Platinum",
      price: "NOTE: placeholder",
      discount: "15%",
      benefits: [
        { included: true, text: "15% discount on all rentals" },
        { included: true, text: "Priority booking (6h)" },
        { included: true, text: "Free vehicle upgrade (unlimited)" },
        { included: true, text: "Free delivery within Accra" },
        { included: true, text: "Dedicated account manager" },
      ],
    },
  ];

  // NOTE: placeholder prices, confirm with client

  return (
    <>
      <Header />
      <main id="main-content">
        {/* Hero */}
        <section className="relative min-h-[50vh] flex items-center bg-ink text-white">
          <div className="w-full py-20">
            <Container>
              <div className="max-w-3xl">
                <h1 className="text-[clamp(2.25rem,6vw,4.5rem)] font-bold mb-6 leading-tight">
                  Join the <Accent>Rigi-X</Accent> Membership
                </h1>
                <p className="text-xl text-white/90 max-w-2xl">
                  Enjoy exclusive discounts, priority booking, and premium benefits with our membership tiers.
                </p>
              </div>
            </Container>
          </div>
        </section>

        {/* Pricing Table */}
        <Section>
          <Container>
            <SectionHeading
              title="Membership Tiers"
              subtitle="Choose the plan that fits your needs"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`bg-white rounded-2xl border-2 p-6 ${
                    tier.popular ? "border-brand shadow-lg" : "border-line"
                  }`}
                >
                  {tier.popular && (
                    <div className="text-center mb-4">
                      <span className="inline-block bg-brand text-white text-sm font-semibold px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <h3 className="text-2xl font-bold text-ink mb-2">{tier.name}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-brand">{tier.discount}</span>
                    <span className="text-muted"> discount</span>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {tier.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2">
                        {benefit.included ? (
                          <Check className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-5 h-5 text-line flex-shrink-0 mt-0.5" />
                        )}
                        <span className="text-sm text-ink">{benefit.text}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={tier.popular ? "primary" : "outline"}
                  >
                    Join {tier.name}
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-muted mt-6">
              * NOTE: Prices are placeholders - confirm with client
            </p>
          </Container>
        </Section>

        {/* FAQ */}
        <Section className="bg-mist">
          <Container>
            <SectionHeading
              title="Membership FAQ"
              align="left"
            />
            <div className="max-w-3xl space-y-4">
              {[
                {
                  q: "How do I join the membership program?",
                  a: "Contact us via WhatsApp or email to sign up for membership. We'll guide you through the process and activate your benefits immediately.",
                },
                {
                  q: "Can I upgrade my membership tier?",
                  a: "Yes, you can upgrade your membership at any time. The additional benefits will be activated immediately.",
                },
                {
                  q: "Do membership discounts apply to all vehicles?",
                  a: "Yes, your membership discount applies to all vehicles in our fleet, including luxury cars.",
                },
                {
                  q: "How long is the membership valid?",
                  a: "Membership is valid for one year from the date of activation. You can renew annually to continue enjoying benefits.",
                },
              ].map((faq, index) => (
                <details key={index} className="bg-white rounded-xl border border-line group">
                  <summary className="px-6 py-4 cursor-pointer font-medium text-ink flex items-center justify-between list-none">
                    {faq.q}
                    <span className="transition-transform group-open:rotate-180">
                      <MessageCircle className="w-4 h-4" />
                    </span>
                  </summary>
                  <div className="px-6 pb-4 text-muted">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </Container>
        </Section>

        {/* CTA */}
        <Section>
          <Container>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-bold text-ink mb-4">
                Ready to <Accent>join</Accent>?
              </h2>
              <p className="text-lg text-muted mb-8">
                Contact us today to sign up and start enjoying exclusive member benefits.
              </p>
              <a
                href={`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(
                  "Hi, I'm interested in joining the Rigi-X membership program."
                )}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="lg">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Join via WhatsApp
                </Button>
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
