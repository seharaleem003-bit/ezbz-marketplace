import type { ReactNode } from "react";

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-heading font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export function LegalPage({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
      <h1 className="text-3xl font-heading font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>

      <div
        className="mt-8 flex flex-col gap-8 text-sm leading-relaxed text-muted-foreground
          [&_a]:font-medium [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4
          [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-foreground
          [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5"
      >
        {children}
      </div>
    </div>
  );
}
