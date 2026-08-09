"use client";

import { useTransition } from "react";

import { setProviderStatusAction } from "./actions";
import { Button } from "@/components/ui/button";

export function ProviderStatusActions({ providerId, status }: { providerId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  function setStatus(next: "ACTIVE" | "REJECTED" | "SUSPENDED" | "PENDING_VERIFICATION") {
    startTransition(() => setProviderStatusAction(providerId, next));
  }

  return (
    <div className="flex justify-end gap-1.5">
      {status !== "ACTIVE" ? (
        <Button variant="outline" size="sm" disabled={isPending} onClick={() => setStatus("ACTIVE")}>
          Force active
        </Button>
      ) : null}
      {status !== "REJECTED" ? (
        <Button variant="ghost" size="sm" disabled={isPending} onClick={() => setStatus("REJECTED")}>
          Reject
        </Button>
      ) : null}
      {status === "ACTIVE" ? (
        <Button variant="ghost" size="sm" disabled={isPending} onClick={() => setStatus("SUSPENDED")}>
          Suspend
        </Button>
      ) : null}
      {status === "SUSPENDED" ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => setStatus("PENDING_VERIFICATION")}
        >
          Reinstate
        </Button>
      ) : null}
    </div>
  );
}
