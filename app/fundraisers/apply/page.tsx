import type { Metadata } from "next";

import { FundraiserApplyForm } from "./apply-form";

export const metadata: Metadata = {
  title: "Start a fundraiser",
};

export default function FundraiserApplyPage() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <h1 className="mb-2 text-2xl font-heading font-semibold">Start a fundraiser</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Schools, churches, and community groups can register a Fundraiser Page. Community
        members donate items instead of cash, items are listed under your organization&apos;s
        name, and EZBZ takes a reduced commission — the rest supports your cause.
      </p>
      <FundraiserApplyForm />
    </div>
  );
}
