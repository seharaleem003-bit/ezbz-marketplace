"use client";

import { useState, type ReactElement } from "react";
import { Check, Copy, Link2, Mail, Share2 } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function FacebookGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-4">
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12" />
    </svg>
  );
}

function WhatsAppGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-4">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.39-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.48s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35M12.05 21.8h-.01a9.8 9.8 0 0 1-5-1.37l-.36-.21-3.72.98.99-3.63-.23-.37a9.79 9.79 0 0 1-1.5-5.23c0-5.4 4.4-9.8 9.82-9.8a9.75 9.75 0 0 1 6.94 2.88 9.72 9.72 0 0 1 2.87 6.93c0 5.4-4.4 9.8-9.8 9.8M20.52 3.45A11.75 11.75 0 0 0 12.05 0C5.5 0 .18 5.32.17 11.86c0 2.09.55 4.13 1.59 5.93L.07 24l6.36-1.67a11.85 11.85 0 0 0 5.62 1.43h.01c6.54 0 11.86-5.32 11.87-11.86a11.8 11.8 0 0 0-3.41-8.39" />
    </svg>
  );
}

function XGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-4">
      <path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.46l8.6-9.83L0 1.15h7.6l5.24 6.93zm-1.29 19.5h2.04L6.49 3.24H4.3z" />
    </svg>
  );
}

export interface ShareMenuLabels {
  copyLink: string;
  copied: string;
  shareVia: string;
  email: string;
  openListing: string;
  earnPrefix: string;
  earnSuffix: string;
  signIn: string;
  signInToEarn: string;
  linkCopied: string;
  copyFailed: string;
}

export function ShareMenu({
  url,
  title,
  trigger,
  referralCode,
  labels,
}: {
  url: string;
  title: string;
  trigger: ReactElement;
  /** Present only for signed-in users — anonymous shares can't be paid out. */
  referralCode?: string | null;
  labels: ShareMenuLabels;
}) {
  const [copied, setCopied] = useState(false);

  const shareUrl = referralCode
    ? `${url}${url.includes("?") ? "&" : "?"}ref=${encodeURIComponent(referralCode)}`
    : url;

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(labels.linkCopied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(labels.copyFailed);
    }
  }

  // Only offered when the browser actually supports it — on desktop this is
  // usually absent, and a dead menu row is worse than no row.
  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  async function nativeShare() {
    try {
      await navigator.share({ title, url: shareUrl });
    } catch {
      // The user dismissed the share sheet — nothing to report.
    }
  }

  function open(href: string) {
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="end">
        <div className="max-w-56 px-2 py-1.5 text-xs text-muted-foreground">
          {referralCode ? (
            <>
              <span className="font-semibold text-gold-600">{labels.earnPrefix}</span>{" "}
              {labels.earnSuffix}
            </>
          ) : (
            <>
              <a href="/login" className="font-semibold text-foreground underline">
                {labels.signIn}
              </a>{" "}
              {labels.signInToEarn}
            </>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyLink}>
          {copied ? <Check /> : <Copy />}
          {copied ? labels.copied : labels.copyLink}
        </DropdownMenuItem>
        {canNativeShare ? (
          <DropdownMenuItem onClick={nativeShare}>
            <Share2 />
            {labels.shareVia}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`)}
        >
          <FacebookGlyph />
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => open(`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`)}
        >
          <WhatsAppGlyph />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => open(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`)}
        >
          <XGlyph />X
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => open(`mailto:?subject=${encodedTitle}&body=${encodedUrl}`)}
        >
          <Mail />
          {labels.email}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => open(shareUrl)}>
          <Link2 />
          {labels.openListing}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
