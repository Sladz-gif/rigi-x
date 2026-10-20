import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingProps {
  rating: number;
  className?: string;
}

export function Rating({ rating, className }: RatingProps) {
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "w-4 h-4",
            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-line"
          )}
        />
      ))}
    </div>
  );
}
