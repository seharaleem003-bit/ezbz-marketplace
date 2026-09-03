"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { setListingStockAction } from "./stock-actions";

type Status = "idle" | "saving" | "saved" | "error";

/**
 * Editable stock cell for the listings table.
 *
 * Saves on its own a moment after typing stops, and immediately on blur or
 * Enter, so there is no way to leave an edit unsaved — an earlier version
 * saved only on blur, which read as "it didn't save" to anyone who typed a
 * number and looked at it. Escape restores the last saved value.
 *
 * The status word next to the box is the whole point: a silent input gives
 * an operator no way to tell a save from a no-op.
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
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearSaved = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against an older, slower save overwriting a newer one.
  const seq = useRef(0);
  const savedRef = useRef(initialQty);

  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);

  useEffect(() => {
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
      if (clearSaved.current) clearTimeout(clearSaved.current);
    };
  }, []);

  const save = useCallback(
    async (next: number) => {
      if (next === savedRef.current) return;

      const ticket = ++seq.current;
      setStatus("saving");
      setMessage(null);

      try {
        const result = await setListingStockAction(listingId, next);
        if (ticket !== seq.current) return; // superseded by a newer edit

        if (result.error) {
          setStatus("error");
          setMessage(result.error);
          return;
        }
        setSaved(next);
        savedRef.current = next;
        setStatus("saved");
        if (clearSaved.current) clearTimeout(clearSaved.current);
        clearSaved.current = setTimeout(() => setStatus("idle"), 2000);
      } catch {
        if (ticket !== seq.current) return;
        setStatus("error");
        setMessage("Couldn't save. Check your connection and try again.");
      }
    },
    [listingId]
  );

  /** Parses the box; returns null when it isn't a usable stock number yet. */
  function parse(raw: string): number | null {
    const trimmed = raw.trim();
    if (trimmed === "") return null;
    const n = Number(trimmed);
    return Number.isInteger(n) && n >= 0 ? n : null;
  }

  function onChange(raw: string) {
    setValue(raw);
    if (status === "error") {
      setStatus("idle");
      setMessage(null);
    }
    if (debounce.current) clearTimeout(debounce.current);
    const parsed = parse(raw);
    if (parsed === null) return;
    debounce.current = setTimeout(() => void save(parsed), 700);
  }

  function commitNow() {
    if (debounce.current) clearTimeout(debounce.current);
    const parsed = parse(value);
    if (parsed === null) {
      setValue(String(saved)); // unusable entry — put the saved number back
      return;
    }
    void save(parsed);
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
          aria-label={`Stock for ${title}`}
          onChange={(e) => onChange(e.target.value)}
          onBlur={commitNow}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitNow();
            } else if (e.key === "Escape") {
              if (debounce.current) clearTimeout(debounce.current);
              setValue(String(saved));
              setStatus("idle");
              setMessage(null);
              e.currentTarget.blur();
            }
          }}
          className={[
            "h-8 w-16 rounded-md border bg-background px-2 text-sm tabular-nums",
            "focus:outline-none focus:ring-2 focus:ring-navy-800/40",
            status === "error" ? "border-destructive" : "border-input",
            saved === 0 ? "text-destructive" : "",
          ].join(" ")}
        />

        {status === "saving" ? (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            Saving
          </span>
        ) : null}
        {status === "saved" ? (
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600">
            <Check className="size-3.5" />
            Saved
          </span>
        ) : null}
      </div>

      {saved === 0 && status !== "error" ? (
        <span className="text-[10px] font-medium text-destructive">Out of stock</span>
      ) : null}
      {message ? (
        <span role="alert" className="max-w-32 text-[10px] text-destructive">
          {message}
        </span>
      ) : null}
    </div>
  );
}
