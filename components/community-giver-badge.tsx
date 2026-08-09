import { Heart } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function CommunityGiverBadge({
  className,
  tone = "light",
}: {
  className?: string;
  tone?: "light" | "dark";
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        tone === "dark" ? "border-white/30 text-white/80" : "text-muted-foreground",
        className
      )}
    >
      <Heart className="size-3" />
      Community Giver
    </Badge>
  );
}
