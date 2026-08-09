import Link from "next/link";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { Button } from "@/components/ui/button";
import { startProviderIdentityVerificationAction } from "./verify/actions";
import { BackgroundCheckButton } from "./background-check/background-check-button";
import { SubscribeButtons } from "./subscribe/subscribe-buttons";

export const metadata: Metadata = {
  title: "Provider dashboard",
};

export const dynamic = "force-dynamic";

const BACKGROUND_CHECK_LABELS: Record<string, string> = {
  NOT_STARTED: "Not started",
  PENDING: "In review",
  CLEAR: "Clear",
  CONSIDER: "Needs review",
  FAILED: "Failed",
};

export default async function ProviderDashboardPage() {
  const session = await verifySession();

  const provider = await prisma.serviceProvider.findUnique({
    where: { userId: session.user.id },
    include: {
      category: true,
      subscriptions: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!provider) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-heading font-semibold">List your services on EZBZ</h1>
        <p className="text-muted-foreground">
          Apply to list your business in the EZBZ services directory — plumbers, caterers,
          photographers, and more.
        </p>
        <Button render={<Link href="/services/apply" />}>Apply now</Button>
      </div>
    );
  }

  if (provider.status === "REJECTED") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-heading font-semibold">Application not approved</h1>
        <p className="text-muted-foreground">Contact EZBZ support if you have questions.</p>
      </div>
    );
  }

  if (provider.status === "SUSPENDED") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-heading font-semibold">Account suspended</h1>
        <p className="text-muted-foreground">Contact EZBZ support for details.</p>
      </div>
    );
  }

  const activeSubscription = provider.subscriptions.find(
    (subscription) => subscription.status === "ACTIVE" && subscription.endsAt > new Date()
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-1 text-2xl font-heading font-semibold">{provider.businessName}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{provider.category.name}</p>

      {provider.status === "ACTIVE" ? (
        <div className="mb-6 rounded-xl bg-primary/10 p-4 text-sm text-primary ring-1 ring-primary/20">
          Your listing is live!{" "}
          <Link href={`/services/providers/${provider.id}`} className="underline">
            View your public profile
          </Link>{" "}
          or{" "}
          <Link href="/provider/flyer" className="underline">
            get your printable flyer & QR code
          </Link>{" "}
          for your shop or truck.
        </div>
      ) : (
        <div className="mb-6 rounded-xl bg-secondary/60 p-4 text-sm ring-1 ring-foreground/10">
          Complete all three steps below to go live in the directory.
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">1. Identity verification</h2>
            <span className="text-sm text-muted-foreground">
              {provider.identityVerifiedAt ? "Verified" : "Not started"}
            </span>
          </div>
          {!provider.identityVerifiedAt ? (
            <form action={startProviderIdentityVerificationAction} className="mt-3">
              <Button type="submit" size="sm">
                Verify identity
              </Button>
            </form>
          ) : null}
        </div>

        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">2. Background check</h2>
            <span className="text-sm text-muted-foreground">
              {BACKGROUND_CHECK_LABELS[provider.backgroundCheckStatus]}
            </span>
          </div>
          {provider.backgroundCheckStatus === "NOT_STARTED" ? (
            <div className="mt-3">
              <BackgroundCheckButton />
            </div>
          ) : null}
        </div>

        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">3. Subscription</h2>
            <span className="text-sm text-muted-foreground">
              {activeSubscription
                ? `Active until ${activeSubscription.endsAt.toLocaleDateString()}`
                : "None active"}
            </span>
          </div>
          {!activeSubscription ? (
            <div className="mt-3">
              <SubscribeButtons />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
