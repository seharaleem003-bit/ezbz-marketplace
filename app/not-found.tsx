import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="text-2xl font-heading font-semibold">Page not found</h1>
      <p className="max-w-md text-muted-foreground">
        We couldn&apos;t find what you were looking for — it may have been moved or the
        listing may no longer be available.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" render={<Link href="/listings" />}>
          Browse deals
        </Button>
        <Button render={<Link href="/" />}>Go home</Button>
      </div>
    </div>
  );
}
