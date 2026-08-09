"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";

export function ListingShareButton({ title }: { title: string }) {
  async function handleShare() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // user cancelled the share sheet — nothing to do
      }
      return;
    }

    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  }

  return (
    <button
      type="button"
      aria-label="Share this listing"
      onClick={handleShare}
      className="text-muted-foreground transition-colors hover:text-foreground"
    >
      <Share2 className="size-6" />
    </button>
  );
}
