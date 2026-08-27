import type { Metadata } from "next";
import Link from "next/link";

import { ImportForm } from "./import-form";

export const metadata: Metadata = {
  title: "Import listings",
};

export const dynamic = "force-dynamic";

export default function ImportListingsPage() {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-semibold">Import listings</h1>
        <Link href="/admin/listings" className="text-sm text-navy-800 hover:underline">
          Back to listings
        </Link>
      </div>

      <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
        Upload a supplier spreadsheet and every product is filed into the catalogue
        automatically. Where nothing suitable exists, a new category is created and slotted
        under the right department rather than forcing a bad match.
      </p>

      <ImportForm />
    </div>
  );
}
