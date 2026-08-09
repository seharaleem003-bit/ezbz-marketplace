import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { AddressForm } from "../../address-form";
import { updateAddressAction } from "../../actions";

export const metadata: Metadata = {
  title: "Edit address",
};

export const dynamic = "force-dynamic";

export default async function EditAddressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await verifySession();

  const address = await prisma.address.findUnique({ where: { id } });
  if (!address || address.userId !== session.user.id) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-heading font-semibold">Edit address</h1>
      <AddressForm
        action={updateAddressAction.bind(null, address.id)}
        defaults={{
          fullName: address.fullName,
          line1: address.line1,
          line2: address.line2 ?? "",
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
          isDefault: address.isDefault,
        }}
        submitLabel="Save changes"
      />
    </div>
  );
}
