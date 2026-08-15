"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Menu, X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface DepartmentNode {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  children: { id: string; slug: string; name: string }[];
}

/**
 * "All departments" mega-menu — the full category tree behind one control.
 *
 * The header can only ever show a handful of featured categories; this is how
 * the rest of the tree stays reachable without burying it in a filter dropdown.
 */
export function DepartmentMenu({
  departments,
  label,
  allLabel,
}: {
  departments: DepartmentNode[];
  label: string;
  allLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(departments[0]?.id ?? null);

  const active = departments.find((d) => d.id === activeId) ?? departments[0];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Menu className="size-4" />
        {label}
      </button>

      {open ? (
        <>
          {/* Click-away layer, below the panel but above the page. */}
          <div
            className="fixed inset-0 z-40 bg-navy-950/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          <div className="absolute left-0 top-full z-50 mt-0 w-full">
            <div className="mx-auto max-w-6xl px-4">
              <div className="overflow-hidden rounded-b-xl bg-background shadow-2xl ring-1 ring-foreground/10">
                <div className="flex items-center justify-between border-b px-4 py-2.5">
                  <p className="text-sm font-semibold">{label}</p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="grid sm:grid-cols-[220px_1fr]">
                  {/* Top-level list; hovering swaps the panel on the right. */}
                  <ul className="border-b py-2 sm:border-b-0 sm:border-r">
                    {departments.map((dept) => (
                      <li key={dept.id}>
                        <Link
                          href={`/listings?category=${dept.slug}`}
                          onMouseEnter={() => setActiveId(dept.id)}
                          onFocus={() => setActiveId(dept.id)}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center justify-between px-4 py-2 text-sm transition-colors",
                            dept.id === active?.id
                              ? "bg-muted font-medium text-foreground"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          )}
                        >
                          {dept.name}
                          {dept.children.length > 0 ? (
                            <ChevronRight className="size-3.5 opacity-60" />
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>

                  <div className="p-4">
                    {active ? (
                      <>
                        <Link
                          href={`/listings?category=${active.slug}`}
                          onClick={() => setOpen(false)}
                          className="text-sm font-semibold hover:underline"
                        >
                          {allLabel} {active.name}
                        </Link>
                        {active.children.length > 0 ? (
                          <ul className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
                            {active.children.map((child) => (
                              <li key={child.id}>
                                <Link
                                  href={`/listings?category=${child.slug}`}
                                  onClick={() => setOpen(false)}
                                  className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                                >
                                  {child.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
