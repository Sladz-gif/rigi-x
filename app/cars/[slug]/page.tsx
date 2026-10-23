import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rating } from "@/components/ui/rating";
import { Gallery } from "@/components/cars/gallery";
import { SpecStrip } from "@/components/cars/spec-strip";
import { BookingCard } from "@/components/booking/booking-card";
import { CarCard } from "@/components/cars/car-card";
import { cars } from "@/data/cars";
import { formatGHS } from "@/lib/utils";
import { Check } from "lucide-react";

interface CarPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  return cars.map((car) => ({
    slug: car.slug,
  }));
}

export async function generateMetadata({ params }: CarPageProps) {
  const { slug } = await params;
  const car = cars.find((c) => c.slug === slug);
  if (!car) return {};

  return {
    title: `${car.brand} ${car.name} | Rigi-X Car Rental`,
    description: car.description,
  };
}

export default async function CarPage({ params }: CarPageProps) {
  const { slug } = await params;
  const car = cars.find((c) => c.slug === slug);

  if (!car) {
    notFound();
  }

  const similarCars = cars
    .filter((c) => c.category === car.category && c.slug !== car.slug)
    .slice(0, 3);

  const specs = [
    { label: "Seats", value: car.seats },
    { label: "Doors", value: car.doors },
    { label: "Transmission", value: car.transmission },
    { label: "Fuel", value: car.fuel },
    { label: "Luggage", value: `${car.luggage} bags` },
    { label: "Engine", value: car.fuel === "Electric" ? "Electric Motor" : "2.0L" },
    { label: "AC", value: "Yes" },
  ];

  if (car.topSpeedKmh) {
    specs.push({ label: "Top Speed", value: `${car.topSpeedKmh} km/h` });
  }

  return (
    <>
      <Header />
      <main id="main-content">
        {/* Breadcrumbs */}
        <div className="bg-mist py-4">
          <Container>
            <nav className="text-sm text-muted">
              <Link href="/" className="hover:text-brand">
                Home
              </Link>
              <span className="mx-2">/</span>
              <Link href="/cars" className="hover:text-brand">
                Cars
              </Link>
              <span className="mx-2">/</span>
              <span className="text-ink">
                {car.brand} {car.name}
              </span>
            </nav>
          </Container>
        </div>

        <Section>
          <Container>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Details */}
              <div className="lg:col-span-2 space-y-8">
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <Badge className="mb-3 capitalize">{car.category}</Badge>
                      <h1 className="text-3xl md:text-4xl font-bold text-ink mb-2">
                        {car.brand} {car.name} {car.year}
                      </h1>
                      {car.rating && <Rating rating={car.rating} />}
                    </div>
                  </div>
                  <p className="text-muted text-lg">{car.description}</p>
                </div>

                {/* Gallery */}
                <Gallery images={car.images} alt={`${car.brand} ${car.name}`} />

                {/* Specs */}
                <div className="bg-mist rounded-2xl p-6">
                  <h3 className="font-semibold text-ink mb-4">Specifications</h3>
                  <SpecStrip specs={specs} size="large" />
                </div>

                {/* Features */}
                <div>
                  <h3 className="font-semibold text-ink mb-4">Features</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {car.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-brand flex-shrink-0" />
                        <span className="text-ink">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rental Terms */}
                <div className="bg-mist rounded-2xl p-6">
                  <h3 className="font-semibold text-ink mb-4">Rental Terms</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted">Daily rate</span>
                      <span className="font-medium text-ink">
                        {formatGHS(car.pricePerDay)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Security deposit</span>
                      <span className="font-medium text-ink">
                        {formatGHS(car.deposit)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Minimum rental</span>
                      <span className="font-medium text-ink">
                        {car.minDays} day{car.minDays !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Fuel policy</span>
                      <span className="font-medium text-ink">Return full</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Mileage</span>
                      <span className="font-medium text-ink">
                        Unlimited (Accra)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Minimum driver age</span>
                      <span className="font-medium text-ink">
                        {car.category === "luxury" ? "25" : "21"}+
                      </span>
                    </div>
                  </div>
                </div>

                {/* Similar Cars */}
                {similarCars.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-ink mb-4">Similar vehicles</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {similarCars.map((similarCar) => (
                        <CarCard key={similarCar.slug} car={similarCar} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Booking Card */}
              <div className="lg:col-span-1">
                <BookingCard car={car} />
              </div>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
      {/* Mobile Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-line p-4 md:hidden z-30">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-ink">{formatGHS(car.pricePerDay)}</span>
              <span className="text-muted text-sm">/ day</span>
            </div>
          </div>
          <div className="flex flex-1 gap-2">
            <Link href={`/book?car=${car.slug}`} className="flex-1">
              <Button variant="outline" className="w-full">
                Book this car
              </Button>
            </Link>
            <Link href={`/checkout?car=${car.slug}`} className="flex-1">
              <Button className="w-full">Rent this car</Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
