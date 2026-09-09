import Image from "next/image";
import Script from "next/script";

/**
 * Brand screen shown while the installed app starts.
 *
 * Deliberately NOT a client component. An earlier version showed itself from
 * a useEffect, which meant it could only appear once React had hydrated — so
 * the app opened on a half-rendered page and the logo arrived afterwards,
 * exactly backwards. This version is in the server-rendered HTML and is
 * switched on by a beforeInteractive script, so it is painted in the first
 * frame, before any of the page is visible.
 *
 * The fade is pure CSS (see globals.css). Nothing here depends on React
 * running at all: if hydration failed entirely the splash would still lift on
 * schedule rather than trapping the shopper behind it.
 *
 * iOS covers this same moment with the launch images declared in
 * app/layout.tsx. This carries Android, whose system splash can only show the
 * manifest icon and not the wordmark, and desktop installs, which otherwise
 * get nothing.
 */

// Runs before any Next.js module, so it is kept tiny and defensive — a throw
// here would happen before the app had a chance to load.
const TOGGLE = `(function(){try{
var s=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
if(!s)return;
try{if(sessionStorage.getItem('ezbz.splash')==='1')return;sessionStorage.setItem('ezbz.splash','1');}catch(e){}
document.documentElement.setAttribute('data-splash','on');
}catch(e){}})();`;

export function AppSplash() {
  return (
    <>
      <Script id="ezbz-splash-toggle" strategy="beforeInteractive">
        {TOGGLE}
      </Script>

      {/* Hidden by default; the script above opts the installed app in, so a
          browser visit never sees it. */}
      <div id="ezbz-splash" aria-hidden>
        <Image
          src="/logo-light.png"
          alt=""
          width={1378}
          height={554}
          priority
          className="w-[62vw] max-w-xs"
        />
        <div className="flex items-center gap-4">
          <span className="h-px w-10 bg-gold-500/70" />
          <span className="text-lg font-semibold tracking-[0.42em] text-gold-500 sm:text-xl">
            MALL
          </span>
          <span className="h-px w-10 bg-gold-500/70" />
        </div>
      </div>
    </>
  );
}
