import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  className?: string;
  align?: "left" | "center";
}

export function SectionHeading({
  title,
  subtitle,
  className,
  align = "center",
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mb-12",
        {
          "text-center": align === "center",
          "text-left": align === "left",
        },
        className
      )}
    >
      <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-bold text-ink mb-4">
        {title}
      </h2>
      {subtitle && (
        <p className="text-lg text-muted max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
    </div>
  );
}
