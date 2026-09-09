import Image from "next/image";

/**
 * Brand screen shown while the installed app starts.
 *
 * Shown and hidden entirely by CSS — see the #ezbz-splash rules in
 * globals.css. `@media (display-mode: standalone)` is true only for the
 * installed app, so the browser never sees this, and because it is a
 * stylesheet rule it applies to the very first paint.
 *
 * Two earlier attempts got this wrong, both by depending on JavaScript:
 * a useEffect could only run after hydration, and next/script's
 * beforeInteractive does not emit an executable tag in the App Router — it
 * queues the source into `self.__next_s` for the Next runtime to evaluate,
 * which is also after the page has painted. Either way the app opened on the
 * page and the logo arrived late. CSS has no such ordering problem.
 *
 * iOS covers this same moment with the launch images declared in
 * app/layout.tsx. This carries Android, whose system splash can only show the
 * manifest icon and not the wordmark, and desktop installs, which otherwise
 * get nothing.
 */

// Safari before 15.4 has no display-mode media query; navigator.standalone is
// the old equivalent. A plain inline tag, deliberately not next/script, so the
// HTML parser runs it where it sits rather than the framework running it later.
const LEGACY_IOS = `try{if(window.navigator.standalone===true){document.documentElement.setAttribute('data-splash','on')}}catch(e){}`;

export function AppSplash() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: LEGACY_IOS }} />

      {/* Hidden unless the CSS says otherwise, so a browser visit never sees
          it. */}
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
