import { cn } from "@/lib/utils";

interface AccentProps {
  children: React.ReactNode;
  className?: string;
}

export function Accent({ children, className }: AccentProps) {
  return (
    <span className={cn("font-playfair italic text-brand", className)}>
      {children}
    </span>
  );
}
