"use client";

import { createContext, useContext, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { bulkDeleteListingsAction, type BulkDeleteReport } from "./actions";

/**
 * Multi-select for the admin listings table.
 *
 * The table itself stays a server component (photos, links, status buttons
 * all render on the server); only the tick boxes and the action bar are
 * client-side, sharing one selection through context. The provider wraps the
 * table, each row drops a <BulkSelectCheckbox>, the header a select-all, and
 * <BulkDeleteBar> appears above the table once anything is ticked.
 */

interface BulkSelectState {
  allIds: string[];
  selected: Set<string>;
  toggle: (id: string) => void;
  toggleAll: () => void;
  clear: () => void;
}

const BulkSelectContext = createContext<BulkSelectState | null>(null);

function useBulkSelect() {
  const ctx = useContext(BulkSelectContext);
  if (!ctx) throw new Error("Bulk-select components must sit inside <BulkSelectProvider>.");
  return ctx;
}

export function BulkSelectProvider({
  allIds,
  children,
}: {
  allIds: string[];
  children: React.ReactNode;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const value = useMemo<BulkSelectState>(
    () => ({
      allIds,
      selected,
      toggle: (id) =>
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),
      toggleAll: () =>
        setSelected((prev) => (prev.size === allIds.length ? new Set() : new Set(allIds))),
      clear: () => setSelected(new Set()),
    }),
    [allIds, selected]
  );

  return <BulkSelectContext.Provider value={value}>{children}</BulkSelectContext.Provider>;
}

const boxClass = "size-4 cursor-pointer accent-navy-800";

export function BulkSelectCheckbox({ id, title }: { id: string; title: string }) {
  const { selected, toggle } = useBulkSelect();
  return (
    <input
      type="checkbox"
      className={boxClass}
      checked={selected.has(id)}
      onChange={() => toggle(id)}
      aria-label={`Select ${title}`}
    />
  );
}

export function BulkSelectAllCheckbox() {
  const { allIds, selected, toggleAll } = useBulkSelect();
  const all = allIds.length > 0 && selected.size === allIds.length;
  const some = selected.size > 0 && !all;
  return (
    <input
      type="checkbox"
      className={boxClass}
      checked={all}
      ref={(el) => {
        if (el) el.indeterminate = some;
      }}
      onChange={toggleAll}
      disabled={allIds.length === 0}
      aria-label={all ? "Deselect all listings" : "Select all listings"}
    />
  );
}

export function BulkDeleteBar() {
  const { selected, clear } = useBulkSelect();
  const [report, setReport] = useState<BulkDeleteReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const count = selected.size;

  function onDelete() {
    const ok = window.confirm(
      count === 1
        ? "Delete this listing? This cannot be undone."
        : `Delete ${count} listings? This cannot be undone.\n\nAny listing that appears on an order will be archived instead, so the sale's history is kept.`
    );
    if (!ok) return;
    const ids = [...selected];
    setError(null);
    startTransition(async () => {
      try {
        const result = await bulkDeleteListingsAction(ids);
        setReport(result);
        clear();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Delete failed. Try again.");
      }
    });
  }

  if (count === 0 && !report && !error) return null;

  return (
    <div className="mb-3 space-y-2">
      {count > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-navy-800 px-4 py-2.5 text-sm text-white shadow-sm">
          <span className="font-medium">
            {count} {count === 1 ? "listing" : "listings"} selected
          </span>
          <button
            type="button"
            onClick={clear}
            className="text-white/80 underline-offset-2 hover:underline"
          >
            Clear
          </button>
          <Button
            size="sm"
            variant="destructive"
            className="ml-auto"
            onClick={onDelete}
            disabled={isPending}
          >
            <Trash2 className="size-4" />
            {isPending ? "Deleting…" : "Delete selected"}
          </Button>
        </div>
      ) : null}

      {report ? (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-900 ring-1 ring-emerald-200"
        >
          Deleted {report.deleted} {report.deleted === 1 ? "listing" : "listings"}.
          {report.archived.length > 0 ? (
            <>
              {" "}
              {report.archived.length} kept as archived because {report.archived.length === 1 ? "it is" : "they are"} on
              an order: {report.archived.join(", ")}.
            </>
          ) : null}{" "}
          <button
            type="button"
            onClick={() => setReport(null)}
            className="underline underline-offset-2"
          >
            Dismiss
          </button>
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
