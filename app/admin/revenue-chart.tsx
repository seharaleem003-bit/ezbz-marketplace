import { formatCents } from "@/lib/format";
import type { DailyPoint } from "@/lib/analytics";

/**
 * 30-day revenue bars.
 *
 * Deliberately CSS rather than a charting library: it's one series of thirty
 * points, and a dependency plus client-side JS to draw thirty rectangles is a
 * bad trade. Renders on the server with the rest of the page.
 */
export function RevenueChart({ daily }: { daily: DailyPoint[] }) {
  const max = Math.max(...daily.map((d) => d.revenueCents), 1);
  const total = daily.reduce((sum, d) => sum + d.revenueCents, 0);

  return (
    <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-heading text-lg font-semibold">Revenue — last 30 days</h2>
        <span className="text-sm text-muted-foreground">{formatCents(total)} total</span>
      </div>

      {total === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No paid orders in the last 30 days yet.
        </p>
      ) : (
        <div className="flex h-40 items-end gap-1" role="img" aria-label="Daily revenue chart">
          {daily.map((d) => {
            const pct = (d.revenueCents / max) * 100;
            return (
              <div key={d.date} className="group/bar relative flex-1">
                <div
                  className="w-full rounded-t bg-navy-800/80 transition-colors group-hover/bar:bg-gold-500"
                  style={{ height: `${Math.max(pct, d.revenueCents > 0 ? 4 : 1)}%` }}
                />
                <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-navy-900 px-2 py-1 text-xs text-white group-hover/bar:block">
                  {d.date} · {formatCents(d.revenueCents)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{daily[0]?.date}</span>
        <span>{daily[daily.length - 1]?.date}</span>
      </div>
    </section>
  );
}
