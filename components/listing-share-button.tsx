"use client";

import { Share2 } from "lucide-react";

import { ShareMenu, type ShareMenuLabels } from "@/components/share-menu";

export function ListingShareButton({
  title,
  url,
  referralCode,
  ariaLabel,
  labels,
}: {
  title: string;
  url: string;
  referralCode?: string | null;
  ariaLabel: string;
  labels: ShareMenuLabels;
}) {
  return (
    <ShareMenu
      url={url}
      title={title}
      referralCode={referralCode}
      labels={labels}
      trigger={
        <button
          type="button"
          aria-label={ariaLabel}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <Share2 className="size-6" />
        </button>
      }
    />
  );
}
