import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";
import { images } from "@/lib/images";
import { siteConfig } from "@/lib/site-config";
import { Accent } from "@/components/ui/accent";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function AboutPage() {
  return (
    <>
      <Header />
      <main id="main-content">
        {/* Hero */}
        <section className="relative min-h-[50vh] flex items-center">
          <SafeImage
            src={images["about-1"].url}
            alt="About Rigi-X"
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/50 to-ink/80" />
          <div className="relative z-10 w-full py-20">
            <Container>
              <div className="max-w-3xl">
                <h1 className="text-[clamp(2.25rem,6vw,4.5rem)] font-bold text-white mb-6 leading-tight">
                  Driving <Accent>convenience</Accent>, comfort and confidence
                </h1>
                <p className="text-xl text-white/90 max-w-2xl">
                  Your trusted partner for premium car rentals in Accra, Ghana.
                </p>
              </div>
            </Container>
          </div>
        </section>

        {/* Story */}
        <Section>
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="relative">
                <SafeImage
                  src={images["about-2"].url}
                  alt="Our story"
                  width={600}
                  height={400}
                  className="rounded-tl-[3rem] rounded-2xl w-full"
                />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-ink mb-4">Our Story</h2>
                <p className="text-muted mb-4">
                  Founded in Accra, Rigi-X was born from a simple idea: make premium car rentals accessible to everyone. We believe that quality transportation shouldn&apos;t be a luxury reserved for the few.
                </p>
                <p className="text-muted mb-6">
                  Over the past decade, we&apos;ve grown from a small fleet to serving over 20,000 customers across 16 regions in Ghana. Our commitment to transparency, quality, and customer service has made us the trusted choice for car rentals.
                </p>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-3xl font-bold text-brand mb-1">
                      {siteConfig.stats.yearsExperience}+
                    </div>
                    <div className="text-muted">Years of experience</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-brand mb-1">
                      {siteConfig.stats.rentalsServed.toLocaleString()}+
                    </div>
                    <div className="text-muted">Happy customers</div>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </Section>

        {/* Stats */}
        <Section className="bg-ink text-white">
          <Container>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: siteConfig.stats.rentalsServed, label: "Rentals served" },
                { value: siteConfig.stats.regionsCovered, label: "Regions covered" },
                { value: siteConfig.stats.cars, label: "Cars in fleet" },
                { value: siteConfig.stats.yearsExperience, label: "Years experience" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-4xl md:text-5xl font-bold text-brand mb-2">
                    {stat.value.toLocaleString()}+
                  </div>
                  <div className="text-white/80">{stat.label}</div>
                </div>
              ))}
            </div>
          </Container>
        </Section>

        {/* Values */}
        <Section className="bg-mist">
          <Container>
            <SectionHeading
              title="Why choose us"
              align="left"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  title: "Wide selection of vehicles",
                  desc: "From economy cars to luxury vehicles, we have the perfect car for every occasion and budget.",
                },
                {
                  title: "Affordable and transparent pricing",
                  desc: "No hidden fees. What you see is what you pay. Clear fuel policy and mileage terms.",
                },
                {
                  title: "Insurance and safety coverage",
                  desc: "Basic insurance included with comprehensive upgrade options. Your safety is our priority.",
                },
              ].map((item, index) => (
                <div key={index}>
                  <h3 className="font-semibold text-ink mb-3">{item.title}</h3>
                  <p className="text-muted">{item.desc}</p>
                </div>
              ))}
            </div>
          </Container>
        </Section>

        {/* Team */}
        <Section>
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-ink mb-4">Our Promise</h2>
                <p className="text-muted mb-4">
                  At Rigi-X, we&apos;re more than just a car rental company. We&apos;re your partner in mobility, committed to providing exceptional service and maintaining the highest standards of vehicle quality.
                </p>
                <p className="text-muted mb-6">
                  Every vehicle in our fleet undergoes regular maintenance and thorough inspections before each rental. Our team is available 24/7 to assist you with any needs during your rental period.
                </p>
                <Link href="/contact">
                  <Button>
                    Get in touch
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
              <div>
                <SafeImage
                  src={images["team"].url}
                  alt="The Rigi-X team"
                  width={600}
                  height={400}
                  className="rounded-2xl w-full"
                />
              </div>
            </div>
          </Container>
        </Section>

        {/* CTA */}
        <Section className="bg-mist">
          <Container>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-bold text-ink mb-4">
                Ready to experience the <Accent>Rigi-X difference</Accent>?
              </h2>
              <p className="text-lg text-muted mb-8">
                Book your perfect car today and join thousands of satisfied customers.
              </p>
              <Link href="/book">
                <Button size="lg">Book now</Button>
              </Link>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
