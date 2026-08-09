import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { AddressForm } from "../address-form";
import { createAddressAction } from "../actions";

export const metadata: Metadata = {
  title: "Add address",
};

export const dynamic = "force-dynamic";

export default async function NewAddressPage() {
  const session = await verifySession();
  const existingCount = await prisma.address.count({ where: { userId: session.user.id } });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-heading font-semibold">Add address</h1>
      <AddressForm
        action={createAddressAction}
        defaults={{
          fullName: "",
          line1: "",
          line2: "",
          city: "",
          state: "",
          postalCode: "",
          country: "United States",
          isDefault: existingCount === 0,
        }}
        hideDefaultToggle={existingCount === 0}
        submitLabel="Save address"
      />
    </div>
  );
}
