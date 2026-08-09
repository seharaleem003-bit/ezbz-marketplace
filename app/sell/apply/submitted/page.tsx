import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Application submitted",
};

export default function SellerApplicationSubmittedPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-heading font-semibold">Application submitted</h1>
      <p className="text-muted-foreground">
        We&apos;ll review your seller application and follow up by email once it&apos;s approved.
      </p>
      <Button render={<Link href="/" />}>Back to home</Button>
    </div>
  );
}
