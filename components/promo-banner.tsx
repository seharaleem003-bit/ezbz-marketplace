const MESSAGE = "Get 10% off your first purchase when you buy through the EZBZ app — download now";

export function PromoBanner() {
  const track = Array.from({ length: 4 }, (_, i) => (
    <span key={i} className="mx-8 shrink-0 text-sm font-medium tracking-wide">
      {MESSAGE}
    </span>
  ));

  return (
    <div className="overflow-hidden border-b bg-gold-500 text-navy-900">
      <div className="animate-marquee flex w-max py-2">
        {track}
        {track}
      </div>
    </div>
  );
}
