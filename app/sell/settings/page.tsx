import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { ShippingAddressForm } from "./shipping-address-form";
import { HandlingTimeForm } from "./handling-time-form";

export const metadata: Metadata = {
  title: "Shipping settings",
};

export const dynamic = "force-dynamic";

export default async function SellerSettingsPage() {
  const session = await verifySession();
  const seller = await prisma.seller.findUnique({ where: { userId: session.user.id } });
  if (!seller) redirect("/sell");

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <h1 className="mb-2 text-2xl font-heading font-semibold">Shipping address</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        This is where your packages ship from — we use it to create shipments and buy labels
        for your orders. It&apos;s never shown to buyers.
      </p>
      <ShippingAddressForm
        defaults={{
          addressLine1: seller.addressLine1 ?? "",
          addressLine2: seller.addressLine2 ?? "",
          city: seller.city ?? "",
          region: seller.region ?? "",
          postalCode: seller.postalCode ?? "",
          country: seller.country,
          phone: seller.phone ?? "",
        }}
      />

      <div className="mt-8 border-t pt-8">
        <h2 className="mb-2 text-lg font-heading font-semibold">Handling time</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          How many business days you typically need to ship an order after it&apos;s placed.
          This is what your on-time shipping rate (used for trust badges) is measured against.
        </p>
        <HandlingTimeForm defaultDays={seller.handlingDays} />
      </div>
    </div>
  );
}
