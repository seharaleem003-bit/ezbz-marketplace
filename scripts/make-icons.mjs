import sharp from "sharp";
import { writeFileSync } from "node:fs";

/**
 * Builds the app icons from the EZBZ MALL lockup.
 *
 * The wordmark is set beneath the logo the same way it is on the launch
 * screen, so the icon on a home screen matches what opens when it is tapped.
 *
 * One deliberate exception: the browser favicon renders at 16-32px, where
 * "MALL" is an illegible smudge that only muddies the mark. That one keeps
 * the EZBZ logo alone — the same reason app stores ask for a simplified mark
 * rather than a full lockup.
 */

const NAVY = "#0a1930";
const GOLD = "#d4a437";

const logo = await sharp("public/logo-light.png").toBuffer();
const logoRatio = (await sharp(logo).metadata()).height / (await sharp(logo).metadata()).width;

/**
 * @param size    square output, px
 * @param inset   fraction of the canvas the artwork may occupy. Maskable
 *                icons are cropped to a circle by Android, so their content
 *                has to sit well inside the square.
 * @param withWord whether to set MALL beneath the logo.
 */
async function icon(size, { inset = 0.82, withWord = true } = {}) {
  const safe = size * inset;
  // Reserve room under the logo for the wordmark and the gap above it.
  const wordBlock = withWord ? 0.34 : 0;
  const logoW = Math.round(Math.min(safe, safe / (1 + wordBlock * logoRatio * 1.6)));
  const logoH = Math.round(logoW * logoRatio);

  const wordSize = Math.round(logoW * 0.15);
  const tracking = Math.round(wordSize * 0.42);
  const gap = Math.round(wordSize * 0.62);

  const blockH = logoH + (withWord ? gap + wordSize : 0);
  const top = Math.round((size - blockH) / 2);
  const left = Math.round((size - logoW) / 2);

  const layers = [{ input: await sharp(logo).resize({ width: logoW }).toBuffer(), top, left }];

  if (withWord) {
    const baseline = top + logoH + gap + Math.round(wordSize * 0.82);
    const overlay = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <text x="${size / 2}" y="${baseline}" font-family="Arial, Helvetica, sans-serif"
            font-size="${wordSize}" font-weight="700" letter-spacing="${tracking}"
            fill="${GOLD}" text-anchor="middle">MALL</text>
    </svg>`;
    layers.push({ input: Buffer.from(overlay), top: 0, left: 0 });
  }

  return sharp({ create: { width: size, height: size, channels: 4, background: NAVY } })
    .composite(layers)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

const OUT = [
  // Home screen and install prompts — shown large enough for the wordmark.
  ["public/icon-192.png", 192, { inset: 0.84 }],
  ["public/icon-512.png", 512, { inset: 0.84 }],
  ["app/apple-icon.png", 512, { inset: 0.84 }],
  // Android crops maskable icons to its own shape, so keep well inside.
  ["public/icon-maskable-512.png", 512, { inset: 0.6 }],
  // Browser tab: too small for the wordmark to read.
  ["app/icon.png", 512, { inset: 0.86, withWord: false }],
];

for (const [path, size, opts] of OUT) {
  writeFileSync(path, await icon(size, opts));
  console.log(`  ${path.padEnd(34)} ${size}x${size}${opts.withWord === false ? "  (mark only)" : ""}`);
}
console.log("\nicons rebuilt");
