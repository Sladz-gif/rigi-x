import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { CarCard } from "@/components/cars/car-card";
import { services } from "@/data/services";
import { cars } from "@/data/cars";
import { SafeImage } from "@/components/ui/safe-image";
import { images } from "@/lib/images";
import { Check, Star, MessageCircle } from "lucide-react";
import { siteConfig } from "@/lib/site-config";

interface ServicePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return services.map((service) => ({
    slug: service.slug,
  }));
}

export async function generateMetadata({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = services.find((s) => s.slug === slug);
  if (!service) return {};

  return {
    title: `${service.name} | Rigi-X Services`,
    description: service.description,
  };
}

export default async function ServicePage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = services.find((s) => s.slug === slug);

  if (!service) {
    notFound();
  }

  const relatedCars = service.relatedCategories
    ? cars.filter((car) => service.relatedCategories!.includes(car.category)).slice(0, 3)
    : cars.slice(0, 3);

  return (
    <>
      <Header />
      <main id="main-content">
        {/* Hero */}
        <section className="relative min-h-[50vh] flex items-center">
          <SafeImage
            src={images[service.image as keyof typeof images].url}
            alt={service.name}
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/50 to-ink/80" />
          <div className="relative z-10 w-full py-20">
            <Container>
              <div className="max-w-3xl">
                <h1 className="text-[clamp(2.25rem,6vw,4.5rem)] font-bold text-white mb-6 leading-tight">
                  {service.name}
                </h1>
                <p className="text-xl text-white/90 max-w-2xl">
                  {service.description}
                </p>
              </div>
            </Container>
          </div>
        </section>

        <Section>
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Left Column - Content */}
              <div className="lg:col-span-2 space-y-12">
                {/* What's Included */}
                <div>
                  <h2 className="text-2xl font-bold text-ink mb-4">What&apos;s included</h2>
                  <ul className="space-y-3">
                    {service.included.map((item, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
                        <span className="text-ink">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Who it's for */}
                <div>
                  <h2 className="text-2xl font-bold text-ink mb-4">Who it&apos;s for</h2>
                  <ul className="space-y-3">
                    {service.for.map((item, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Star className="w-5 h-5 text-brand flex-shrink-0 mt-0.5" />
                        <span className="text-ink">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* How it works */}
                <div>
                  <h2 className="text-2xl font-bold text-ink mb-4">How it works</h2>
                  <ol className="space-y-4">
                    {service.howItWorks.map((step, index) => (
                      <li key={index} className="flex items-start gap-4">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center font-bold">
                          {index + 1}
                        </span>
                        <span className="text-ink pt-1">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Pricing */}
                {service.pricing && (
                  <div className="bg-mist rounded-2xl p-6">
                    <h2 className="text-2xl font-bold text-ink mb-2">Pricing</h2>
                    <p className="text-lg text-muted">{service.pricing}</p>
                  </div>
                )}

                {/* Related Cars */}
                {relatedCars.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold text-ink mb-4">Related vehicles</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {relatedCars.map((car) => (
                        <CarCard key={car.slug} car={car} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - CTA */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl border border-line p-6 sticky top-24">
                  <h3 className="font-semibold text-ink mb-4">Ready to book?</h3>
                  <p className="text-muted text-sm mb-6">
                    Get started with {service.name} today. Contact us for more information or book directly.
                  </p>
                  <div className="space-y-3">
                    <Link href="/book" className="block">
                      <Button className="w-full">Book now</Button>
                    </Link>
                    <a
                      href={`https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(
                        `Hi, I'm interested in ${service.name}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button variant="outline" className="w-full">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Chat on WhatsApp
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}
