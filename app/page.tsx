import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { WhatsAppButton } from "@/components/layout/whatsapp-button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Accent } from "@/components/ui/accent";
import { SafeImage } from "@/components/ui/safe-image";
import { images } from "@/lib/images";
import { siteConfig } from "@/lib/site-config";
import { cars } from "@/data/cars";
import { testimonials } from "@/data/testimonials";
import { faqs } from "@/data/faqs";
import { services } from "@/data/services";
import { Check, Shield, Truck, HeadphonesIcon, Car as CarIcon, Star, ArrowRight, Copy } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const featuredCars = cars.slice(0, 6);
  const topFaqs = faqs.slice(0, 5);

  return (
    <>
      <Header />
      <main id="main-content">
        {/* Hero */}
        <section className="relative min-h-[85svh] md:min-h-[100svh] flex items-center">
          <SafeImage
            src={images["hero-1"].url}
            alt={images["hero-1"].alt}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/50 to-ink/80" />
          
          <div className="relative z-10 w-full py-20">
            <Container>
              <div className="max-w-3xl text-center md:text-left mb-12">
                <h1 className="text-[clamp(2.25rem,6vw,4.5rem)] font-bold text-white mb-6 leading-tight">
                  Premium car rentals at <Accent>everyday prices</Accent>
                </h1>
                <p className="text-xl text-white/90 mb-8 max-w-2xl">
                  Self-drive or chauffeur-driven. Transparent pricing, no hidden fees, delivered across Accra.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                  <Link href="/book">
                    <Button size="lg" className="w-full sm:w-auto">
                      Book now
                    </Button>
                  </Link>
                  <Link href="/cars">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-ink">
                      View fleet
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Booking Search Bar */}
              <div className="bg-white rounded-2xl p-6 shadow-xl max-w-4xl mx-auto md:mx-0">
                <form className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">
                      Pickup location
                    </label>
                    <select className="w-full px-4 py-2.5 rounded-lg border border-line bg-mist text-ink focus:outline-none focus:border-brand">
                      <option>Accra Airport (KIA)</option>
                      <option>Dzorwulu</option>
                      <option>Airport Residential</option>
                      <option>East Legon</option>
                      <option>Osu</option>
                      <option>Custom address</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">
                      Pickup date
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-2.5 rounded-lg border border-line bg-mist text-ink focus:outline-none focus:border-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">
                      Return date
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-2.5 rounded-lg border border-line bg-mist text-ink focus:outline-none focus:border-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">
                      Service type
                    </label>
                    <select className="w-full px-4 py-2.5 rounded-lg border border-line bg-mist text-ink focus:outline-none focus:border-brand">
                      <option>Self-drive</option>
                      <option>Chauffeur-driven</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" className="w-full">
                      Search cars
                    </Button>
                  </div>
                </form>
                <p className="text-xs text-muted mt-3">
                  * Minimum 2 days for self-drive rentals
                </p>
              </div>
            </Container>
          </div>
        </section>

        {/* Trust Strip */}
        <Section className="bg-mist">
          <Container>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { icon: Check, text: "No hidden fees" },
                { icon: Shield, text: "Insurance options" },
                { icon: Truck, text: "Airport delivery" },
                { icon: HeadphonesIcon, text: "24/7 support" },
              ].map((item, index) => (
                <div key={index} className="flex flex-col items-center text-center">
                  <item.icon className="w-8 h-8 text-brand mb-3" />
                  <span className="font-medium text-ink">{item.text}</span>
                </div>
              ))}
            </div>
          </Container>
        </Section>

        {/* Browse by Category */}
        <Section>
          <Container>
            <SectionHeading
              title="Browse by category"
              subtitle="Find the perfect vehicle for your needs"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: "Economy", image: "category-economy", count: cars.filter(c => c.category === "economy").length },
                { name: "Sedan", image: "category-sedan", count: cars.filter(c => c.category === "sedan").length },
                { name: "SUV", image: "category-suv", count: cars.filter(c => c.category === "suv").length },
                { name: "Luxury", image: "category-luxury", count: cars.filter(c => c.category === "luxury").length },
              ].map((category) => (
                <Link
                  key={category.name}
                  href={`/cars?category=${category.name.toLowerCase()}`}
                  className="group relative rounded-2xl overflow-hidden aspect-square"
                >
                  <SafeImage
                    src={images[category.image as keyof typeof images].url}
                    alt={category.name}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-white font-semibold text-lg">{category.name}</h3>
                    <p className="text-white/80 text-sm">{category.count} vehicles</p>
                  </div>
                </Link>
              ))}
            </div>
          </Container>
        </Section>

        {/* Featured Cars */}
        <Section className="bg-mist">
          <Container>
            <SectionHeading
              title="Featured vehicles"
              subtitle="Our most popular cars for rent"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {featuredCars.map((car) => (
                <Link
                  key={car.slug}
                  href={`/cars/${car.slug}`}
                  className="group bg-white rounded-2xl overflow-hidden border border-line hover:shadow-lg transition-shadow"
                >
                  <div className="relative aspect-[4/3]">
                    <SafeImage
                      src={images[car.images[0] as keyof typeof images].url}
                      alt={`${car.brand} ${car.name}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    {car.tag && (
                      <span className="absolute top-3 left-3 bg-brand text-white text-xs font-semibold px-3 py-1 rounded-full">
                        {car.tag}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-ink">
                          {car.brand} {car.name}
                        </h3>
                        <p className="text-sm text-muted capitalize">{car.category}</p>
                      </div>
                      {car.rating && (
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{car.rating}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted mb-4">
                      <span>{car.seats} seats</span>
                      <span>·</span>
                      <span>{car.transmission}</span>
                      <span>·</span>
                      <span>{car.fuel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-ink">
                          ₵{car.pricePerDay.toLocaleString()}
                        </span>
                        <span className="text-muted text-sm"> / day</span>
                      </div>
                      <span className="text-brand font-medium text-sm group-hover:underline">
                        View details
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <div className="text-center">
              <Link href="/cars">
                <Button variant="outline" size="lg">
                  See all vehicles
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </Container>
        </Section>

        {/* How It Works */}
        <Section>
          <Container>
            <SectionHeading
              title="How it works"
              subtitle="Rent a car in three simple steps"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
              <div className="space-y-6">
                {[
                  { step: "01", title: "Choose & book online", desc: "Browse our fleet and book your preferred vehicle with just a few clicks" },
                  { step: "02", title: "Pick up your vehicle", desc: "Documents verified, quick inspection, and you're ready to go" },
                  { step: "03", title: "Drive, enjoy & return", desc: "Easy extensions, flexible return, and excellent support" },
                ].map((item) => (
                  <div key={item.step} className="relative pl-12">
                    <span className="absolute left-0 top-0 text-6xl font-bold text-mist -z-10">
                      {item.step}
                    </span>
                    <h3 className="font-semibold text-ink mb-2">{item.title}</h3>
                    <p className="text-muted">{item.desc}</p>
                  </div>
                ))}
              </div>
              <div className="md:col-span-2">
                <SafeImage
                  src={images["how-it-works"].url}
                  alt={images["how-it-works"].alt}
                  width={800}
                  height={500}
                  className="rounded-2xl w-full"
                />
              </div>
            </div>
          </Container>
        </Section>

        {/* Services Preview */}
        <Section className="bg-mist">
          <Container>
            <SectionHeading
              title="Our services"
              subtitle="Comprehensive car rental solutions"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.slice(0, 6).map((service) => (
                <Link
                  key={service.slug}
                  href={`/services/${service.slug}`}
                  className="bg-white rounded-2xl p-6 border border-line hover:shadow-lg transition-shadow group"
                >
                  <div className="w-12 h-12 rounded-full bg-mist flex items-center justify-center mb-4 group-hover:bg-brand group-hover:text-white transition-colors">
                    <CarIcon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-ink mb-2">{service.name}</h3>
                  <p className="text-muted text-sm line-clamp-2">{service.description}</p>
                  <span className="inline-flex items-center gap-1 text-brand font-medium text-sm mt-4 group-hover:underline">
                    Learn more <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              ))}
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

        {/* Why Choose Us */}
        <Section>
          <Container>
            <SectionHeading
              title="Why choose us"
              subtitle="The Rigi-X difference"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: CarIcon,
                  title: "Wide selection of vehicles",
                  desc: "From economy cars to luxury vehicles, we have the perfect car for every occasion and budget.",
                },
                {
                  icon: Shield,
                  title: "Affordable and transparent pricing",
                  desc: "No hidden fees. What you see is what you pay. Clear fuel policy and mileage terms.",
                },
                {
                  icon: Check,
                  title: "Insurance and safety coverage",
                  desc: "Basic insurance included with comprehensive upgrade options. Your safety is our priority.",
                },
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 rounded-full bg-mist flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-8 h-8 text-brand" />
                  </div>
                  <h3 className="font-semibold text-ink mb-3">{item.title}</h3>
                  <p className="text-muted">{item.desc}</p>
                </div>
              ))}
            </div>
          </Container>
        </Section>

        {/* Promo Banner */}
        <Section className="bg-brand text-white">
          <Container>
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">
                  Get 15% off your rental when you book online
                </h2>
                <p className="text-white/90">Use promo code at checkout</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-white/20 px-4 py-2 rounded-lg font-mono font-bold">
                  {siteConfig.promoCode}
                </div>
                <button className="flex items-center gap-2 bg-white text-brand px-4 py-2 rounded-lg font-medium hover:bg-white/90 transition-colors">
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
              </div>
            </div>
          </Container>
        </Section>

        {/* Testimonials */}
        <Section className="bg-mist">
          <Container>
            <SectionHeading
              title="What our customers say"
              subtitle="Real reviews from real customers"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testimonials.slice(0, 3).map((testimonial) => (
                <div key={testimonial.id} className="bg-white rounded-2xl p-6 border border-line">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted mb-4">&ldquo;{testimonial.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/image.jpg"
                      alt={testimonial.name}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-medium text-ink">{testimonial.name}</div>
                      {testimonial.location && (
                        <div className="text-sm text-muted">{testimonial.location}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </Section>

        {/* FAQ Teaser */}
        <Section>
          <Container>
            <SectionHeading
              title="Frequently asked questions"
              subtitle="Quick answers to common questions"
            />
            <div className="max-w-3xl mx-auto space-y-4 mb-8">
              {topFaqs.map((faq) => (
                <details key={faq.id} className="bg-white rounded-xl border border-line group">
                  <summary className="px-6 py-4 cursor-pointer font-medium text-ink flex items-center justify-between list-none">
                    {faq.question}
                    <span className="transition-transform group-open:rotate-180">
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </summary>
                  <div className="px-6 pb-4 text-muted">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
            <div className="text-center">
              <Link href="/faqs">
                <Button variant="outline">
                  See all FAQs
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </Container>
        </Section>

        {/* Final CTA */}
        <Section className="bg-mist">
          <Container>
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-bold text-ink mb-4">
                Ready to <Accent>hit the road</Accent>?
              </h2>
              <p className="text-lg text-muted mb-8">
                Book your perfect car today and experience the Rigi-X difference.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/book">
                  <Button size="lg">Book now</Button>
                </Link>
                <a
                  href={`https://wa.me/${siteConfig.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="lg" variant="outline">
                    Chat on WhatsApp
                  </Button>
                </a>
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
