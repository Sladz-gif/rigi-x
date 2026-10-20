import Link from "next/link";
import { Service } from "@/types";
import { SafeImage } from "@/components/ui/safe-image";
import { images } from "@/lib/images";
import { ArrowRight, Car as CarIcon } from "lucide-react";

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <Link
      href={`/services/${service.slug}`}
      className="group bg-white rounded-2xl overflow-hidden border border-line hover:shadow-lg transition-shadow"
    >
      <div className="relative aspect-[16/9]">
        <SafeImage
          src={images[service.image as keyof typeof images].url}
          alt={service.name}
          fill
          className="object-cover transition-transform group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
      <div className="p-6">
        <div className="w-12 h-12 rounded-full bg-mist flex items-center justify-center mb-4 group-hover:bg-brand group-hover:text-white transition-colors">
          <CarIcon className="w-6 h-6" />
        </div>
        <h3 className="font-semibold text-ink mb-2 text-lg">{service.name}</h3>
        <p className="text-muted text-sm mb-4">{service.description}</p>
        <span className="inline-flex items-center gap-1 text-brand font-medium text-sm group-hover:underline">
          Learn more <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </Link>
  );
}
