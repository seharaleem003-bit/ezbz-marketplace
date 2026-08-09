import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { PrintButton } from "./print-button";

export const metadata: Metadata = {
  title: "Your EZBZ flyer",
};

export const dynamic = "force-dynamic";

export default async function ProviderFlyerPage() {
  const session = await verifySession();

  const provider = await prisma.serviceProvider.findUnique({
    where: { userId: session.user.id },
    include: { category: true },
  });
  if (!provider) redirect("/services/apply");
  if (provider.status !== "ACTIVE") redirect("/provider");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const profileUrl = `${appUrl}/services/providers/${provider.id}`;
  const qrCodeDataUrl = await QRCode.toDataURL(profileUrl, {
    margin: 1,
    width: 320,
    color: { dark: "#0a1930", light: "#ffffff" },
  });

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href="/provider" className="text-sm text-muted-foreground underline">
          ← Provider dashboard
        </Link>
        <PrintButton />
      </div>

      <p className="mb-4 text-sm text-muted-foreground print:hidden">
        Print this and display it in your shop, truck, or storefront — customers who scan it
        land straight on your EZBZ listing. No ad spend required.
      </p>

      <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-navy-900 bg-white p-8 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-gold-600">
          Find us on EZBZ
        </p>
        <h1 className="text-2xl font-heading font-semibold text-navy-900">
          {provider.businessName}
        </h1>
        <p className="text-sm text-navy-700">{provider.category.name}</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- a data: URI, next/image can't optimize it and doesn't need to */}
        <img src={qrCodeDataUrl} alt="QR code to this business's EZBZ listing" className="size-56" />
        <p className="max-w-xs text-sm text-navy-700">
          Scan to see our reviews and book more work through EZBZ
        </p>
      </div>
    </div>
  );
}
