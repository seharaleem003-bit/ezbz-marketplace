import Link from "next/link";

import { requireAdmin } from "@/lib/auth/dal";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 lg:flex-row">
      <nav className="flex shrink-0 flex-row gap-1 lg:w-48 lg:flex-col">
        <Link
          href="/admin"
          className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
        >
          Dashboard
        </Link>
        <Link
          href="/admin/listings"
          className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
        >
          Listings
        </Link>
        <Link
          href="/admin/categories"
          className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
        >
          Categories
        </Link>
        <Link
          href="/admin/orders"
          className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
        >
          Orders
        </Link>
        <Link
          href="/admin/sellers"
          className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
        >
          Sellers
        </Link>
        <Link
          href="/admin/fundraisers"
          className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
        >
          Fundraisers
        </Link>
        <Link
          href="/admin/help-board"
          className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
        >
          Help Board
        </Link>
        <Link
          href="/admin/partners"
          className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
        >
          Partners
        </Link>
        <Link
          href="/admin/service-categories"
          className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
        >
          Service categories
        </Link>
        <Link
          href="/admin/providers"
          className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
        >
          Providers
        </Link>
        <Link
          href="/admin/support"
          className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
        >
          Support
        </Link>
      </nav>
      <div className="flex-1">{children}</div>
    </div>
  );
}
