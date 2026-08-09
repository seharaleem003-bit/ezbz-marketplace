import Link from "next/link";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Services directory",
};

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const categories = await prisma.serviceCategory.findMany({
    orderBy: [{ group: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { providers: { where: { status: "ACTIVE" } } } } },
  });

  const groups = new Map<string, typeof categories>();
  for (const category of categories) {
    const list = groups.get(category.group) ?? [];
    list.push(category);
    groups.set(category.group, list);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-8 rounded-xl bg-navy-900 p-6 text-white">
        <p className="text-xs font-medium uppercase tracking-widest text-gold-400">
          EZBZ Services
        </p>
        <h1 className="mt-1 text-2xl font-heading font-semibold">Local services directory</h1>
        <p className="mt-2 max-w-2xl text-white/70">
          Find trusted local providers — plumbers, caterers, photographers, and more — all
          verified before they can list.
        </p>
      </div>

      {groups.size === 0 ? (
        <p className="text-muted-foreground">No service categories yet — check back soon.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {Array.from(groups.entries()).map(([group, list]) => (
            <div key={group}>
              <h2 className="mb-3 text-lg font-medium">{group}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {list.map((category) => (
                  <Link
                    key={category.id}
                    href={`/services/${category.slug}`}
                    className="rounded-lg bg-card p-3 text-sm ring-1 ring-foreground/10 transition-shadow hover:shadow-md"
                  >
                    <p className="font-medium">{category.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {category._count.providers} provider
                      {category._count.providers === 1 ? "" : "s"}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
