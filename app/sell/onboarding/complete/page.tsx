import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Payout setup",
};

export default function OnboardingCompletePage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-heading font-semibold">Thanks!</h1>
      <p className="text-muted-foreground">
        We&apos;re confirming your payout account with Stripe — this usually takes just a
        moment. Head back to your seller dashboard to check status.
      </p>
      <Button render={<Link href="/sell" />}>Go to seller dashboard</Button>
    </div>
  );
}
