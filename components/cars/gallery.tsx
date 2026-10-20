"use client";

import { useState } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import { images } from "@/lib/images";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface GalleryProps {
  images: string[];
  alt: string;
}

export function Gallery({ images: imageKeys, alt }: GalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const nextImage = () => {
    setSelectedIndex((prev) => (prev + 1) % imageKeys.length);
  };

  const prevImage = () => {
    setSelectedIndex((prev) => (prev - 1 + imageKeys.length) % imageKeys.length);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Main Image */}
        <div
          className="relative aspect-[16/9] md:aspect-[2/1] rounded-2xl overflow-hidden cursor-pointer"
          onClick={() => setIsLightboxOpen(true)}
        >
          <SafeImage
            src={images[imageKeys[selectedIndex] as keyof typeof images].url}
            alt={`${alt} - view ${selectedIndex + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1000px"
          />
          {imageKeys.length > 1 && (
            <div className="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {selectedIndex + 1} / {imageKeys.length}
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {imageKeys.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {imageKeys.map((key, index) => (
              <button
                key={key}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  "relative aspect-video rounded-lg overflow-hidden border-2 transition-colors",
                  selectedIndex === index
                    ? "border-brand"
                    : "border-transparent hover:border-line"
                )}
              >
                <SafeImage
                  src={images[key as keyof typeof images].url}
                  alt={`${alt} thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 25vw, 200px"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 text-white hover:text-brand transition-colors"
            aria-label="Close lightbox"
          >
            <X className="w-8 h-8" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
            className="absolute left-4 p-2 text-white hover:text-brand transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <div className="relative w-full h-full max-w-5xl max-h-[90vh] p-8">
            <SafeImage
              src={images[imageKeys[selectedIndex] as keyof typeof images].url}
              alt={`${alt} - view ${selectedIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
            className="absolute right-4 p-2 text-white hover:text-brand transition-colors"
            aria-label="Next image"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      )}
    </>
  );
}
