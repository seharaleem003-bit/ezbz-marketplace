import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.serviceCategory.findUnique({ where: { slug } });
  if (!category) return {};
  return { title: category.name };
}

export default async function ServiceCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const category = await prisma.serviceCategory.findUnique({
    where: { slug },
    include: {
      providers: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!category) notFound();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <Link href="/services" className="text-sm text-muted-foreground underline">
        ← All services
      </Link>
      <h1 className="mt-2 mb-1 text-2xl font-heading font-semibold">{category.name}</h1>
      <p className="mb-6 text-sm text-muted-foreground">{category.group}</p>

      {category.providers.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          No active providers in this category yet — check back soon.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {category.providers.map((provider) => (
            <Link
              key={provider.id}
              href={`/services/providers/${provider.id}`}
              className="flex flex-col gap-1.5 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-shadow hover:shadow-md"
            >
              <h2 className="font-medium">{provider.businessName}</h2>
              {provider.city || provider.region ? (
                <p className="text-xs text-muted-foreground">
                  {[provider.city, provider.region].filter(Boolean).join(", ")}
                </p>
              ) : null}
              <p className="line-clamp-2 text-sm text-muted-foreground">{provider.description}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
