"use client";

import { useTransition } from "react";

import { setSellerStatusAction } from "./actions";
import { Button } from "@/components/ui/button";

export function SellerStatusActions({
  sellerId,
  status,
}: {
  sellerId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();

  function setStatus(next: "APPROVED" | "REJECTED" | "SUSPENDED") {
    startTransition(() => setSellerStatusAction(sellerId, next));
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
