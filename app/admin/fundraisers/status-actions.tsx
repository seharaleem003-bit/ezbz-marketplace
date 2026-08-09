"use client";

import { useTransition } from "react";

import { setFundraiserStatusAction } from "./actions";
import { Button } from "@/components/ui/button";

export function FundraiserStatusActions({
  fundraiserId,
  status,
}: {
  fundraiserId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();

  function setStatus(next: "APPROVED" | "REJECTED" | "SUSPENDED") {
    startTransition(() => setFundraiserStatusAction(fundraiserId, next));
  }

  return (
    <div className="flex justify-end gap-1.5">
      {status !== "APPROVED" ? (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => setStatus("APPROVED")}
        >
          Approve
        </Button>
      ) : null}
      {status !== "REJECTED" ? (
        <Button variant="ghost" size="sm" disabled={isPending} onClick={() => setStatus("REJECTED")}>
          Reject
        </Button>
      ) : null}
      {status === "APPROVED" ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => setStatus("SUSPENDED")}
        >
          Suspend
        </Button>
      ) : null}
    </div>
  );
}
