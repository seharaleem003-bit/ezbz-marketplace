import { ShieldCheck, BadgeCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ProviderTrustBadges({
  identityVerified,
  backgroundCheckClear,
  className,
  tone = "light",
}: {
  identityVerified: boolean;
  backgroundCheckClear: boolean;
  className?: string;
  tone?: "light" | "dark";
}) {
  const outlineClass = tone === "dark" ? "border-white/30 text-white/80" : "text-muted-foreground";

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {identityVerified ? (
        <Badge variant="outline" className={cn("gap-1", outlineClass)}>
          <ShieldCheck className="size-3" />
          Identity Verified
        </Badge>
      ) : null}
      {backgroundCheckClear ? (
        <Badge variant="outline" className={cn("gap-1", outlineClass)}>
          <BadgeCheck className="size-3" />
          Background Checked
        </Badge>
      ) : null}
    </div>
  );
}
