"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CONDITION_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "LIKE_NEW", label: "Like New" },
  { value: "GOOD", label: "Good" },
  { value: "FAIR", label: "Fair" },
  { value: "SALVAGE", label: "Salvage" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "deal-score-desc", label: "Best Deal Score" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

export interface FilterCategory {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
}

/**
 * Flattens the category tree into a depth-indented list so the dropdown reads
 * as a hierarchy — otherwise "Metal" and "Acrylic" sit next to "Cat food"
 * with nothing showing they belong to Dog play pens.
 */
function flattenTree(categories: FilterCategory[]) {
  const out: { slug: string; label: string }[] = [];

  const walk = (parentId: string | null, depth: number) => {
    for (const category of categories.filter((c) => c.parentId === parentId)) {
      out.push({
        slug: category.slug,
        label: `${"  ".repeat(depth)}${depth > 0 ? "└ " : ""}${category.name}`,
      });
      walk(category.id, depth + 1);
    }
  };

  walk(null, 0);
  return out;
}

export function ListingFilters({ categories }: { categories: FilterCategory[] }) {
  const categoryOptions = flattenTree(categories);
  const router = useRouter();
  const searchParams = useSearchParams();

  const pushParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      params.delete("page");
      router.push(`/listings?${params.toString()}`);
    },
    [router, searchParams]
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    pushParams({
      q: (formData.get("q") as string) || undefined,
      minPrice: (formData.get("minPrice") as string) || undefined,
      maxPrice: (formData.get("maxPrice") as string) || undefined,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
    >
      <div className="flex min-w-48 flex-1 flex-col gap-1.5">
        <label htmlFor="q" className="text-xs font-medium text-muted-foreground">
          Search
        </label>
        <Input
          id="q"
          name="q"
          placeholder="Search listings…"
          defaultValue={searchParams.get("q") ?? ""}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Category</span>
        <Select
          value={searchParams.get("category") ?? "all"}
          onValueChange={(value) =>
            pushParams({ category: !value || value === "all" ? undefined : value })
          }
          items={[
            { value: "all", label: "All categories" },
            ...categoryOptions.map((option) => ({ value: option.slug, label: option.label })),
          ]}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categoryOptions.map((option) => (
              <SelectItem key={option.slug} value={option.slug}>
                <span className="whitespace-pre">{option.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Condition</span>
        <Select
          value={searchParams.get("condition") ?? "all"}
          onValueChange={(value) =>
            pushParams({ condition: !value || value === "all" ? undefined : value })
          }
          items={[{ value: "all", label: "Any condition" }, ...CONDITION_OPTIONS]}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Any condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any condition</SelectItem>
            {CONDITION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="minPrice" className="text-xs font-medium text-muted-foreground">
          Min $
        </label>
        <Input
          id="minPrice"
          name="minPrice"
          type="number"
          min={0}
          className="w-24"
          defaultValue={searchParams.get("minPrice") ?? ""}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="maxPrice" className="text-xs font-medium text-muted-foreground">
          Max $
        </label>
        <Input
          id="maxPrice"
          name="maxPrice"
          type="number"
          min={0}
          className="w-24"
          defaultValue={searchParams.get("maxPrice") ?? ""}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Sort</span>
        <Select
          value={searchParams.get("sort") ?? "newest"}
          onValueChange={(value) => pushParams({ sort: value ?? undefined })}
          items={SORT_OPTIONS}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit">Apply</Button>
    </form>
  );
}
