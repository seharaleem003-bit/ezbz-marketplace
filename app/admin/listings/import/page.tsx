import type { Metadata } from "next";
import Link from "next/link";

import { ImportForm } from "./import-form";
import { requireCatalogAccess } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Import listings",
};

export const dynamic = "force-dynamic";

export default async function ImportListingsPage() {
  await requireCatalogAccess();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-semibold">Import listings</h1>
        <div className="flex items-center gap-4 text-sm">
          <a
            href="/admin/listings/import/template"
            className="font-medium text-navy-800 hover:underline"
          >
            Download blank template
          </a>
          <Link href="/admin/listings" className="text-navy-800 hover:underline">
            Back to listings
          </Link>
        </div>
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
