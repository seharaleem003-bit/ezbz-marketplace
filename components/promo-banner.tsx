import { getDictionary } from "@/lib/i18n";

export async function PromoBanner() {
  const dict = await getDictionary();

  const track = Array.from({ length: 4 }, (_, i) => (
    <span key={i} className="mx-8 shrink-0 text-sm font-medium tracking-wide">
      {dict.promo.banner}
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
