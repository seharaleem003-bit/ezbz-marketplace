import Link from "next/link";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth/dal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SetDefaultButton, DeleteAddressButton } from "./address-actions";

export const metadata: Metadata = {
  title: "My addresses",
};

export const dynamic = "force-dynamic";

export default async function AddressesPage() {
  const session = await verifySession();

  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold">My addresses</h1>
          <p className="text-sm text-muted-foreground">
            Saved addresses speed up checkout — pick one instead of retyping it.
          </p>
        </div>
        <Button render={<Link href="/account/addresses/new" />}>Add address</Button>
      </div>

      {addresses.length === 0 ? (
        <p className="text-muted-foreground">You don&apos;t have any saved addresses yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="flex items-start justify-between gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
            >
              <div className="text-sm">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-medium">{address.fullName}</span>
                  {address.isDefault ? <Badge>Default</Badge> : null}
                </div>
                <p className="text-muted-foreground">
                  {address.line1}
                  {address.line2 ? <> {address.line2}</> : null}
                  <br />
                  {address.city}, {address.state} {address.postalCode}
                  <br />
                  {address.country}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Button variant="ghost" size="sm" render={<Link href={`/account/addresses/${address.id}/edit`} />}>
                  Edit
                </Button>
                {!address.isDefault ? <SetDefaultButton addressId={address.id} /> : null}
                <DeleteAddressButton addressId={address.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
