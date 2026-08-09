import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function SellerTrustBadges({
  badgeTier,
  identityVerified,
  className,
  tone = "light",
}: {
  badgeTier: "NEW" | "TRUSTED" | "TOP";
  identityVerified: boolean;
  className?: string;
  // "dark" is for placements on a dark background (e.g. the navy shop
  // hero) — the outline variant otherwise renders near-invisible there
  // since it relies on ambient light-mode text/border colors.
  tone?: "light" | "dark";
}) {
  const outlineClass = tone === "dark" ? "border-white/30 text-white/80" : "text-muted-foreground";

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {badgeTier === "TOP" ? (
        <Badge className="bg-gold-500 text-navy-900">Top Seller</Badge>
      ) : badgeTier === "TRUSTED" ? (
        <Badge variant="secondary">Trusted Seller</Badge>
      ) : (
        <Badge variant="outline" className={outlineClass}>
          New Seller
        </Badge>
      )}
      {identityVerified ? (
        <Badge variant="outline" className={cn("gap-1", outlineClass)}>
          <ShieldCheck className="size-3" />
          Identity Verified
        </Badge>
      ) : null}
    </div>
  );
}
