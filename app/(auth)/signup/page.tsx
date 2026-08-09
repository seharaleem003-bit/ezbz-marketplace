import { Suspense } from "react";
import type { Metadata } from "next";

import { Skeleton } from "@/components/ui/skeleton";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Create account — EZBZ Marketplace",
};

export default function SignupPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[420px] w-full rounded-xl" />}>
      <SignupForm />
    </Suspense>
  );
}
