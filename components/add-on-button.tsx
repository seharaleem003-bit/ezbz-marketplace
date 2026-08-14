"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { addToCartAction } from "@/app/cart/actions";
import { Button } from "@/components/ui/button";

export function AddOnButton({
  listingId,
  labels,
}: {
  listingId: string;
  labels: { add: string; adding: string; added: string };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const formData = new FormData();
          formData.set("listingId", listingId);
          formData.set("quantity", "1");
          await addToCartAction(formData);
          toast.success(labels.added);
          // Re-render checkout so the totals and free-shipping meter update.
          router.refresh();
        })
      }
    >
      <Plus />
      {isPending ? labels.adding : labels.add}
    </Button>
  );
}
