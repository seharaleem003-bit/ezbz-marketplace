import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

/**
 * Builds the launch screens shown while the installed app starts.
 *
 * iOS will not generate one from the manifest the way Android does — it shows
 * a blank white page unless given an image per device size, which is why this
 * produces a set rather than a single file.
 */

const NAVY = "#0a1930";
const GOLD = "#d4a437";
const OUT = "public/splash";
mkdirSync(OUT, { recursive: true });

// Portrait device sizes, as CSS px x DPR. Covers every iPhone still receiving
// iOS updates plus the current iPads.
const DEVICES = [
  { w: 430, h: 932, dpr: 3 }, // 15/16 Pro Max, 14 Pro Max
  { w: 393, h: 852, dpr: 3 }, // 15/16, 14 Pro
  { w: 428, h: 926, dpr: 3 }, // 13/12 Pro Max
  { w: 390, h: 844, dpr: 3 }, // 13/14, 12
  { w: 375, h: 812, dpr: 3 }, // X, XS, 11 Pro, 13 mini
  { w: 414, h: 896, dpr: 3 }, // XS Max, 11 Pro Max
  { w: 414, h: 896, dpr: 2 }, // XR, 11
  { w: 375, h: 667, dpr: 2 }, // SE 2/3, 8
  { w: 414, h: 736, dpr: 3 }, // 8 Plus
  { w: 820, h: 1180, dpr: 2 }, // iPad Air
  { w: 834, h: 1194, dpr: 2 }, // iPad Pro 11"
  { w: 1024, h: 1366, dpr: 2 }, // iPad Pro 12.9"
];

const logo = await sharp("public/logo-light.png").toBuffer();
const logoMeta = await sharp(logo).metadata();
const logoRatio = logoMeta.height / logoMeta.width;

for (const d of DEVICES) {
  const W = d.w * d.dpr;
  const H = d.h * d.dpr;

  // Logo takes a little over half the width on phones, less on the wider
  // iPads so it doesn't dominate.
  const logoW = Math.round(W * (d.w >= 800 ? 0.42 : 0.62));
  const logoH = Math.round(logoW * logoRatio);

  const resized = await sharp(logo).resize({ width: logoW }).toBuffer();

  // The lockup sits slightly above centre — optically centred, since the eye
  // reads a block low when it is placed at true middle.
  const blockTop = Math.round(H * 0.5 - (logoH + logoW * 0.24) / 2 - H * 0.03);

  const wordSize = Math.round(logoW * 0.145);
  const tracking = Math.round(wordSize * 0.42);
  const wordY = blockTop + logoH + Math.round(wordSize * 1.5);
  // Rules flank the word; width is proportional so it scales with the logo.
  const ruleW = Math.round(logoW * 0.16);
  const ruleGap = Math.round(logoW * 0.13);
  const wordHalf = Math.round((wordSize * 4 * 0.72 + tracking * 3) / 2);
  const ruleY = wordY - Math.round(wordSize * 0.32);

  const overlay = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <text x="${W / 2}" y="${wordY}"
            font-family="Arial, Helvetica, sans-serif" font-size="${wordSize}"
            font-weight="700" letter-spacing="${tracking}"
            fill="${GOLD}" text-anchor="middle"
            >MALL</text>
      <rect x="${W / 2 - wordHalf - ruleGap - ruleW}" y="${ruleY}" width="${ruleW}" height="${Math.max(2, Math.round(wordSize * 0.045))}" fill="${GOLD}" opacity="0.75"/>
      <rect x="${W / 2 + wordHalf + ruleGap}" y="${ruleY}" width="${ruleW}" height="${Math.max(2, Math.round(wordSize * 0.045))}" fill="${GOLD}" opacity="0.75"/>
    </svg>`;

  const name = `${W}x${H}.png`;
  await sharp({ create: { width: W, height: H, channels: 4, background: NAVY } })
    .composite([
      { input: resized, top: blockTop, left: Math.round((W - logoW) / 2) },
      { input: Buffer.from(overlay), top: 0, left: 0 },
    ])
    .png({ compressionLevel: 9, palette: true })
    .toFile(`${OUT}/${name}`);

  console.log(`  ${name.padEnd(12)} (${d.w}x${d.h} @${d.dpr}x)`);
}

// The link tags Next needs in <head>, written out so they can be pasted in.
const links = DEVICES.map((d) => ({
  url: `/splash/${d.w * d.dpr}x${d.h * d.dpr}.png`,
  media: `(device-width: ${d.w}px) and (device-height: ${d.h}px) and (-webkit-device-pixel-ratio: ${d.dpr}) and (orientation: portrait)`,
}));
writeFileSync(".scratch/splash-links.json", JSON.stringify(links, null, 2));
console.log(`\n${DEVICES.length} splash screens written to ${OUT}`);
