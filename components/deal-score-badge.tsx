import { cn } from "@/lib/utils";

function tierFor(score: number): { label: string; className: string } {
  if (score >= 85) {
    return { label: "Outstanding Deal", className: "bg-gold-500 text-navy-900" };
  }
  if (score >= 70) {
    return { label: "Great Deal", className: "bg-gold-400/90 text-navy-900" };
  }
  if (score >= 50) {
    return { label: "Good Deal", className: "bg-navy-800 text-white" };
  }
  return { label: "Fair Deal", className: "bg-muted text-muted-foreground" };
}

export function DealScoreBadge({
  score,
  size = "md",
  className,
}: {
  score: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const tier = tierFor(score);

  const sizeClasses = {
    sm: "gap-1 px-2 py-0.5 text-xs",
    md: "gap-1.5 px-2.5 py-1 text-sm",
    lg: "gap-2 px-3.5 py-1.5 text-base",
  }[size];

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full font-semibold shadow-sm",
        sizeClasses,
        tier.className,
        className
      )}
      title={`Deal Score™ ${score}/100 — ${tier.label}`}
    >
      <span className="font-bold">{score}</span>
      <span className="opacity-90">Deal Score&trade;</span>
    </div>
  );
}
