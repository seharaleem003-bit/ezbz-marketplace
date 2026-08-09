import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Identity verification",
};

export default function ProviderVerifyCompletePage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-heading font-semibold">Verification submitted</h1>
      <p className="text-muted-foreground">
        Stripe is reviewing your ID and selfie. This is usually instant but can take a few
        minutes — check back on your provider dashboard.
      </p>
      <Button render={<Link href="/provider" />}>Go to provider dashboard</Button>
    </div>
  );
}
