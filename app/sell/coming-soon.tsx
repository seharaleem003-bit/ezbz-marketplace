import Link from "next/link";
import { Store } from "lucide-react";

import { getDictionary } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

/**
 * Shown at /sell while seller signups are closed (see SELLER_SIGNUP_OPEN).
 *
 * Deliberately not a dead end: the point of the page is to keep the interest
 * rather than lose it, so it sends people to the catalogue and to contact.
 */
export async function SellComingSoon() {
  const dict = await getDictionary();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 px-4 py-20 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-navy-900/10 text-navy-900">
        <Store className="size-7" />
      </span>

      <span className="rounded-full bg-gold-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-navy-900">
        {dict.sell.comingSoonBadge}
      </span>

      <h1 className="font-heading text-3xl font-bold">{dict.sell.comingSoonTitle}</h1>

      <p className="text-muted-foreground">{dict.sell.comingSoonBlurb}</p>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Button render={<Link href="/listings" />}>{dict.sell.comingSoonShop}</Button>
        <Button variant="outline" render={<Link href="/contact" />}>
          {dict.sell.comingSoonContact}
        </Button>
      </div>
    </div>
  );
}
