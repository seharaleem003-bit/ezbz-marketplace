import type { Metadata } from "next";

import { getCustomers } from "@/lib/analytics";
import { formatCents } from "@/lib/format";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Customers",
};

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function AdminCustomersPage() {
  await requireAdmin();

  const customers = await getCustomers();

  const buyers = customers.filter((c) => c.orderCount > 0);
  const totalSpent = customers.reduce((sum, c) => sum + c.totalSpentCents, 0);

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Customers</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="font-heading text-2xl font-bold">{customers.length}</p>
          <p className="text-xs text-muted-foreground">Registered</p>
        </div>
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="font-heading text-2xl font-bold">{buyers.length}</p>
          <p className="text-xs text-muted-foreground">Have ordered</p>
        </div>
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="font-heading text-2xl font-bold">
            {customers.length > 0
              ? `${Math.round((buyers.length / customers.length) * 100)}%`
              : "—"}
          </p>
          <p className="text-xs text-muted-foreground">Converted</p>
        </div>
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="font-heading text-2xl font-bold">{formatCents(totalSpent)}</p>
          <p className="text-xs text-muted-foreground">Lifetime value</p>
        </div>
      </div>

      <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        {customers.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No customers yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Customer</th>
                  <th className="py-2 pr-3 font-medium">Email</th>
                  <th className="py-2 pr-3 font-medium">Joined</th>
                  <th className="py-2 pr-3 text-right font-medium">Orders</th>
                  <th className="py-2 pr-3 font-medium">Last order</th>
                  <th className="py-2 text-right font-medium">Spent</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">{c.name ?? "—"}</td>
                    <td className="max-w-[16rem] truncate py-2 pr-3 text-muted-foreground">
                      {c.email ?? "—"}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {dateFmt.format(c.createdAt)}
                    </td>
                    <td className="py-2 pr-3 text-right">{c.orderCount}</td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {c.lastOrderAt ? dateFmt.format(c.lastOrderAt) : "—"}
                    </td>
                    <td className="py-2 text-right font-medium">
                      {formatCents(c.totalSpentCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
