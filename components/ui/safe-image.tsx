"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";
import { Car } from "lucide-react";
import { cn } from "@/lib/utils";

interface SafeImageProps extends Omit<ImageProps, "onError"> {
  fallback?: React.ReactNode;
}

export function SafeImage({ fallback, className, ...props }: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      fallback || (
        <div
          className={cn(
            "flex items-center justify-center bg-mist text-muted",
            className
          )}
        >
          <Car className="w-12 h-12" />
        </div>
      )
    );
  }

  return (
    <Image
      {...props}
      alt={props.alt || ""}
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
