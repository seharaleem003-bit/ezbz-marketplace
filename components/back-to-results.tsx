"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";

/**
 * "Back to results" for a product page.
 *
 * Uses history when the shopper arrived from somewhere on this site, because
 * that returns them to the exact result list they were reading — same search,
 * same filters, same scroll position. A category link cannot do that; it
 * throws away everything they had typed.
 *
 * Falls back to the category page for anyone who landed here cold (a shared
 * link, a search engine), where there is no history to go back to.
 */
export function BackToResults({
  categoryHref,
  categoryName,
}: {
  categoryHref: string;
  categoryName: string;
}) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // Same-origin referrer means an in-site navigation, so history.back()
    // lands somewhere useful rather than on whatever preceded the site.
    let sameSite = false;
    try {
      sameSite = Boolean(document.referrer) && new URL(document.referrer).origin === location.origin;
    } catch {
      sameSite = false;
    }
    setCanGoBack(sameSite && window.history.length > 1);
  }, []);

  const className =
    "inline-flex items-center gap-1 text-sm font-medium text-navy-800 transition-colors hover:text-navy-900 hover:underline";

  if (canGoBack) {
    return (
      <button type="button" onClick={() => router.back()} className={className}>
        <ChevronLeft className="size-4" />
        Back to results
      </button>
    );
  }

  return (
    <Link href={categoryHref} className={className}>
      <ChevronLeft className="size-4" />
      All {categoryName}
    </Link>
  );
}
