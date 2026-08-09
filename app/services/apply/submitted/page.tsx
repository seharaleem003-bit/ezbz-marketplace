import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Application submitted",
};

export default function ProviderApplySubmittedPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-heading font-semibold">Application submitted</h1>
      <p className="text-muted-foreground">
        Next up: verify your identity, complete a background check, and choose a subscription
        plan — all from your provider dashboard.
      </p>
      <Button render={<Link href="/provider" />}>Go to provider dashboard</Button>
    </div>
  );
}
