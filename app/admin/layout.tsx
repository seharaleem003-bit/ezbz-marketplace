import Link from "next/link";

import { requireCatalogAccess, isStaffOnly } from "@/lib/auth/dal";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Staff reach the layout; individual pages still gate themselves, so a page
  // that forgets to is closed by default rather than open.
  const session = await requireCatalogAccess();
  const staffOnly = isStaffOnly(session.user.role);

  if (staffOnly) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 lg:flex-row">
        <nav className="flex shrink-0 flex-row gap-1 lg:w-48 lg:flex-col">
          <Link
            href="/admin/listings"
            className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
          >
            Listings
          </Link>
          <Link
            href="/admin/listings/import"
            className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
          >
            Import
          </Link>
        </nav>
        <div className="flex-1">{children}</div>
      </div>
    );
  }

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
          href="/admin/customers"
          className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
        >
          Customers
        </Link>
        <Link
          href="/admin/sellers"
          className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
        >
          Sellers
        </Link>
        <Link
          href="/admin/users"
          className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
        >
          Users
        </Link>
        <Link
          href="/admin/messages"
          className="rounded-md px-3 py-2 text-sm font-medium hover:bg-secondary"
        >
          Messages
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
