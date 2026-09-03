"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

/**
 * Keyword filter for the admin listings table.
 *
 * Filtering happens on the server via the `q` search param, so the table
 * stays a server component and a typed query survives a refresh or a
 * bookmark. Typing is debounced so each keystroke isn't a round trip.
 */
export function ListingSearchForm({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(initialQuery);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep in step when the URL changes from elsewhere (back button, Clear).
  useEffect(() => setValue(initialQuery), [initialQuery]);
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function push(next: string) {
    const search = new URLSearchParams(params.toString());
    if (next.trim()) search.set("q", next.trim());
    else search.delete("q");
    const qs = search.toString();
    router.replace(qs ? `/admin/listings?${qs}` : "/admin/listings");
  }

  function onChange(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push(next), 250);
  }

  return (
    <div className="relative w-full sm:max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (timer.current) clearTimeout(timer.current);
            push(value);
          }
        }}
        placeholder="Search listings by title, category, or keyword…"
        aria-label="Search listings"
        className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-navy-800/40"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setValue("");
            if (timer.current) clearTimeout(timer.current);
            push("");
          }}
          className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
