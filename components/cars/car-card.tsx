import Link from "next/link";
import { Car as CarType } from "@/types";
import { SafeImage } from "@/components/ui/safe-image";
import { Badge } from "@/components/ui/badge";
import { Rating } from "@/components/ui/rating";
import { images } from "@/lib/images";
import { formatGHS } from "@/lib/utils";

interface CarCardProps {
  car: CarType;
  estimatedTotal?: number;
}

export function CarCard({ car, estimatedTotal }: CarCardProps) {
  return (
    <Link
      href={`/cars/${car.slug}`}
      className="group bg-white rounded-2xl overflow-hidden border border-line hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
    >
      <div className="relative aspect-[4/3]">
        <SafeImage
          src={images[car.images[0] as keyof typeof images].url}
          alt={`${car.brand} ${car.name}`}
          fill
          className="object-cover transition-transform group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {car.tag && (
          <Badge
            variant={car.tag === "Popular" ? "popular" : "new"}
            className="absolute top-3 left-3"
          >
            {car.tag}
          </Badge>
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
          {car.rating && <Rating rating={car.rating} />}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted mb-4">
          <span>{car.seats} seats</span>
          <span>·</span>
          <span>{car.transmission}</span>
          <span>·</span>
          <span>{car.fuel}</span>
          <span>·</span>
          <span>{car.luggage} bags</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            {car.category === "luxury" && <span className="text-muted text-sm">From </span>}
            <span className="text-lg font-bold text-ink">
              {formatGHS(car.pricePerDay)}
            </span>
            <span className="text-muted text-sm"> / day</span>
          </div>
          {estimatedTotal && (
            <div className="text-right">
              <span className="text-xs text-muted">Est. total</span>
              <div className="font-semibold text-brand">{formatGHS(estimatedTotal)}</div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
