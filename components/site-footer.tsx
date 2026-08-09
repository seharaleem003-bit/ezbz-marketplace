import Link from "next/link";

const SECTIONS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Contact Us", href: "/contact" },
      { label: "Help Board", href: "/help-board" },
    ],
  },
  {
    title: "Shop",
    links: [
      { label: "Browse deals", href: "/listings" },
      { label: "Best Deal Scores", href: "/listings?sort=deal-score-desc" },
      { label: "Wishlist", href: "/wishlist" },
      { label: "Cart", href: "/cart" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-navy-900 text-white">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-4 py-12 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <Link href="/" className="text-lg font-heading font-semibold tracking-tight">
            EZ<span className="text-gold-400">BZ</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm text-white/60">
            Liquidation and auction deals with Deal Score™ ratings, so you know exactly what
            you&apos;re buying.
          </p>
        </div>

        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h3 className="text-sm font-semibold text-white">{section.title}</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-white/50">
          &copy; {new Date().getFullYear()} EZBZ Marketplace. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
