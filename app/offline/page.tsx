import Link from "next/link";
import { WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata = { title: "You're offline" };

/**
 * Shown by the service worker when a page is requested with no connection.
 * Static on purpose — it has to work with the network down.
 */
export default function OfflinePage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-navy-900/10 text-navy-900">
        <WifiOff className="size-7" />
      </span>
      <h1 className="font-heading text-2xl font-bold">You&apos;re offline</h1>
      <p className="text-muted-foreground">
        EZBZ needs a connection to show live prices and stock. Reconnect and try again — nothing
        in your cart has been lost.
      </p>
      <Button render={<Link href="/" />}>Try again</Button>
    </div>
  );
}
