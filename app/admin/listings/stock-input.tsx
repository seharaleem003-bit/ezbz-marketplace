"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check } from "lucide-react";

import { setListingStockAction } from "./stock-actions";

/**
 * Editable stock cell for the listings table.
 *
 * Saves on blur or Enter rather than on every keystroke, so typing "12"
 * doesn't briefly persist "1". Escape restores the saved value. The tick is
 * shown only briefly — a permanent one would be indistinguishable from a
 * control that does nothing.
 */
export function StockInput({
  listingId,
  initialQty,
  title,
}: {
  listingId: string;
  initialQty: number;
  title: string;
}) {
  const [saved, setSaved] = useState(initialQty);
  const [value, setValue] = useState(String(initialQty));
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function commit() {
    const trimmed = value.trim();
    const next = Number(trimmed);

    if (trimmed === "" || !Number.isInteger(next) || next < 0) {
      setValue(String(saved));
      setError(null);
      return;
    }
    if (next === saved) return;

    setError(null);
    startTransition(async () => {
      const result = await setListingStockAction(listingId, next);
      if (result.error) {
        setError(result.error);
        setValue(String(saved));
        return;
      }
      setSaved(next);
      setJustSaved(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setJustSaved(false), 1600);
    });
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={value}
          disabled={isPending}
          aria-label={`Stock for ${title}`}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === "Escape") {
              setValue(String(saved));
              e.currentTarget.blur();
            }
          }}
          className={[
            "h-8 w-16 rounded-md border bg-background px-2 text-sm tabular-nums",
            "focus:outline-none focus:ring-2 focus:ring-navy-800/40",
            error ? "border-destructive" : "border-input",
            isPending ? "opacity-60" : "",
            saved === 0 ? "text-destructive" : "",
          ].join(" ")}
        />
        {justSaved && !isPending ? (
          <Check className="size-4 text-emerald-600" aria-label="Saved" />
        ) : null}
      </div>
      {saved === 0 && !error ? (
        <span className="text-[10px] font-medium text-destructive">Out of stock</span>
      ) : null}
      {error ? (
        <span role="alert" className="text-[10px] text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
