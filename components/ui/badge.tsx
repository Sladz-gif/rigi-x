import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "popular" | "new";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        {
          "bg-mist text-ink": variant === "default",
          "bg-brand text-white": variant === "popular",
          "bg-ink text-white": variant === "new",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
