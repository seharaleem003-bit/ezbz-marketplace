"use client";

import { useActionState } from "react";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importCatalogAction, type ImportState } from "./import-actions";

export function ImportForm() {
  const [state, action, pending] = useActionState<ImportState, FormData>(
    importCatalogAction,
    undefined
  );

  const report = state?.report;

  return (
    <div className="flex flex-col gap-6">
      <form action={action} className="flex max-w-xl flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="file">Spreadsheet (.xlsx or .csv)</Label>
          <Input id="file" name="file" type="file" accept=".xlsx,.csv" required />
          <p className="text-xs text-muted-foreground">
            Needs a title column and a price column. Description, condition, colour and image
            URL columns are used when present — headings are matched loosely, so
            &ldquo;Products Price&rdquo; and &ldquo;Price&rdquo; both work.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="publish" defaultChecked className="size-4" />
          Publish immediately (otherwise imported as drafts)
        </label>

        <Button type="submit" disabled={pending} className="w-fit">
          <Upload />
          {pending ? "Importing — this can take a minute…" : "Import & categorise"}
        </Button>

        {state?.error ? (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}
      </form>

      {report ? (
        <div className="flex flex-col gap-5">
          <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <p className="font-heading text-lg font-semibold">
              Imported {report.imported} product{report.imported === 1 ? "" : "s"}
            </p>
            {report.createdCategories.length > 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Created {report.createdCategories.length} new categor
                {report.createdCategories.length === 1 ? "y" : "ies"}:{" "}
                {report.createdCategories.join(", ")}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Everything fitted existing categories.
              </p>
            )}
          </div>

          {report.skipped.length > 0 ? (
            <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <p className="mb-2 font-semibold text-destructive">
                Skipped {report.skipped.length}
              </p>
              <ul className="space-y-1 text-sm">
                {report.skipped.map((s) => (
                  <li key={s.row}>
                    <span className="text-muted-foreground">Row {s.row}:</span> {s.title} —{" "}
                    {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <p className="mb-3 font-semibold">Where everything went</p>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Product</th>
                    <th className="py-2 pr-3 font-medium">Category</th>
                    <th className="py-2 font-medium">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {report.placements.map((p, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="max-w-sm truncate py-1.5 pr-3">{p.title}</td>
                      <td className="py-1.5 pr-3">
                        {p.category}
                        {p.isNew ? (
                          <span className="ml-1.5 rounded bg-gold-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-navy-900">
                            new
                          </span>
                        ) : null}
                      </td>
                      <td className="py-1.5">
                        <span
                          className={
                            p.confidence === "high"
                              ? "text-green-700"
                              : p.confidence === "low"
                                ? "text-destructive"
                                : "text-muted-foreground"
                          }
                        >
                          {p.confidence}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Anything marked <span className="text-destructive">low</span> is worth checking —
              open it in Listings and change the category if it&apos;s wrong.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
