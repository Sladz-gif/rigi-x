import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { ServiceCard } from "@/components/sections/service-card";
import { services } from "@/data/services";
import { SafeImage } from "@/components/ui/safe-image";
import { images } from "@/lib/images";
import { Accent } from "@/components/ui/accent";

export default function ServicesPage() {
  return (
    <>
      <Header />
      <main id="main-content">
        {/* Hero */}
        <section className="relative min-h-[50vh] flex items-center">
          <SafeImage
            src={images["service-self-drive"].url}
            alt="Car rental services"
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/50 to-ink/80" />
          <div className="relative z-10 w-full py-20">
            <Container>
              <div className="max-w-3xl">
                <h1 className="text-[clamp(2.25rem,6vw,4.5rem)] font-bold text-white mb-6 leading-tight">
                  Our <Accent>Services</Accent>
                </h1>
                <p className="text-xl text-white/90 max-w-2xl">
                  Comprehensive car rental solutions tailored to your needs. From self-drive adventures to chauffeur-driven luxury.
                </p>
              </div>
            </Container>
          </div>
        </section>

        {/* Services Grid */}
        <Section>
          <Container>
            <SectionHeading
              title="What we offer"
              subtitle="Choose the service that fits your needs"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <ServiceCard key={service.slug} service={service} />
              ))}
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
