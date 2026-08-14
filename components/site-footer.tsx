import Image from "next/image";
import Link from "next/link";

import { SocialLinks } from "@/components/social-links";
import { getDictionary } from "@/lib/i18n";

export async function SiteFooter() {
  const dict = await getDictionary();

  const SECTIONS: { title: string; links: { label: string; href: string }[] }[] = [
    {
      title: dict.footer.company,
      links: [
        { label: dict.footer.aboutUs, href: "/about" },
        { label: dict.footer.contactUs, href: "/contact" },
        { label: dict.footer.startSelling, href: "/sell" },
        { label: dict.footer.helpBoard, href: "/help-board" },
      ],
    },
    {
      title: dict.footer.shop,
      links: [
        { label: dict.footer.browseDeals, href: "/listings" },
        { label: dict.footer.bestDealScores, href: "/listings?sort=deal-score-desc" },
        { label: dict.footer.wishlist, href: "/wishlist" },
        { label: dict.footer.cart, href: "/cart" },
      ],
    },
    {
      title: dict.footer.legal,
      links: [
        { label: dict.footer.terms, href: "/terms" },
        { label: dict.footer.privacy, href: "/privacy" },
      ],
    },
  ];

  return (
    <footer className="border-t bg-navy-900 text-white">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-4 py-12 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <Link href="/" aria-label="EZBZ home" className="inline-block">
            {/* Light variant — the navy half of the wordmark is invisible on the navy footer. */}
            <Image
              src="/logo-light.png"
              alt="EZBZ"
              width={1378}
              height={554}
              className="h-9 w-auto"
            />
          </Link>
          <p className="mt-3 max-w-xs text-sm text-white/60">{dict.footer.tagline}</p>
          <SocialLinks className="mt-4 flex items-center gap-2" />
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
          &copy; {new Date().getFullYear()} EZBZ Marketplace. {dict.footer.rights}
        </div>
      </div>
    </footer>
  );
}
