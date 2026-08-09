"use client";

import { useTransition } from "react";

import { deleteAddressAction, setDefaultAddressAction } from "./actions";
import { Button } from "@/components/ui/button";

export function SetDefaultButton({ addressId }: { addressId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => setDefaultAddressAction(addressId))}
    >
      Set as default
    </Button>
  );
}

export function DeleteAddressButton({ addressId }: { addressId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => deleteAddressAction(addressId))}
    >
      Delete
    </Button>
  );
}
