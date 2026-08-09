"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function GetAppDialog({ qrCodeDataUrl }: { qrCodeDataUrl: string }) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            size="sm"
            className="rounded-full bg-gold-500 text-navy-900 hover:bg-gold-400"
          />
        }
      >
        Get the app
      </DialogTrigger>
      <DialogContent className="sm:max-w-xs">
        <DialogTitle className="text-center text-xl">
          Get the free EZ<span className="text-gold-500">BZ</span> app
        </DialogTitle>

        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <p className="text-sm text-muted-foreground">Scan the QR code to download EZBZ</p>

          {/* eslint-disable-next-line @next/next/no-img-element -- a data: URI, next/image can't optimize it and doesn't need to */}
          <img src={qrCodeDataUrl} alt="QR code to download the EZBZ app" className="size-48" />

          <div className="flex items-center gap-2">
            <a
              href="#"
              className="flex h-10 items-center gap-2 rounded-lg bg-black px-3 text-white"
            >
              <span className="text-2xl leading-none"></span>
              <span className="flex flex-col items-start leading-tight">
                <span className="text-[10px]">Download on the</span>
                <span className="text-sm font-semibold">App Store</span>
              </span>
            </a>
            <a
              href="#"
              className="flex h-10 items-center gap-2 rounded-lg bg-black px-3 text-white"
            >
              <span className="text-lg leading-none">▶</span>
              <span className="flex flex-col items-start leading-tight">
                <span className="text-[10px]">GET IT ON</span>
                <span className="text-sm font-semibold">Google Play</span>
              </span>
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
