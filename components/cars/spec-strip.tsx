import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpecStripProps {
  specs: {
    label: string;
    value: string | number;
  }[];
  size?: "normal" | "large";
  className?: string;
}

export function SpecStrip({ specs, size = "normal", className }: SpecStripProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-4 md:gap-6",
        size === "large" ? "text-base" : "text-sm",
        className
      )}
    >
      {specs.map((spec) => (
        <div key={spec.label} className="flex items-center gap-2">
          <Check className="w-4 h-4 text-brand flex-shrink-0" />
          <span className="text-muted">{spec.label}:</span>
          <span className="font-medium text-ink">{spec.value}</span>
        </div>
      ))}
    </div>
  );
}
