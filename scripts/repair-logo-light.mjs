import sharp from "sharp";

/**
 * Repairs a cut-out artefact in public/logo-light.png.
 *
 * The light logo (white EZ, for dark backgrounds) carries a ragged patch of
 * leftover white inside the bottom-right of the Z, plus a thin white sliver
 * along its baseline — visible wherever the logo sits on navy: the app icon,
 * the launch screen and the in-app splash.
 *
 * public/logo.png is the same artwork with a navy EZ and its gold is clean,
 * so the two files are pixel-identical everywhere right of the E and Z
 * letters. That makes the dark file a reliable source to patch from: for the
 * gold region only, any near-white opaque pixel in the light file is replaced
 * with the corresponding pixel from the clean one. The white EZ letters are
 * left of that boundary and are never touched.
 */

const SRC_LIGHT = "public/logo-light.png";
const SRC_CLEAN = "public/logo.png";

// Right of this the artwork is gold in both files. The white EZ ends well
// before it, so the boundary protects the letters from being recoloured.
const GOLD_FROM_X = 720;
const NEAR_WHITE = 235;
const OPAQUE = 200;

const light = await sharp(SRC_LIGHT).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const clean = await sharp(SRC_CLEAN).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

if (light.info.width !== clean.info.width || light.info.height !== clean.info.height) {
  throw new Error("logo-light.png and logo.png are different sizes; cannot patch from one to the other");
}

const { width: W, height: H } = light.info;
const out = Buffer.from(light.data);
let patched = 0;

for (let y = 0; y < H; y++) {
  for (let x = GOLD_FROM_X; x < W; x++) {
    const i = (y * W + x) * 4;
    const isWhite =
      out[i + 3] > OPAQUE && out[i] > NEAR_WHITE && out[i + 1] > NEAR_WHITE && out[i + 2] > NEAR_WHITE;
    if (!isWhite) continue;
    out[i] = clean.data[i];
    out[i + 1] = clean.data[i + 1];
    out[i + 2] = clean.data[i + 2];
    out[i + 3] = clean.data[i + 3];
    patched++;
  }
}

await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(SRC_LIGHT);

let remaining = 0;
const check = await sharp(SRC_LIGHT).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (let y = 0; y < H; y++) {
  for (let x = GOLD_FROM_X; x < W; x++) {
    const i = (y * W + x) * 4;
    if (check.data[i + 3] > OPAQUE && check.data[i] > NEAR_WHITE && check.data[i + 1] > NEAR_WHITE && check.data[i + 2] > NEAR_WHITE)
      remaining++;
  }
}

console.log(`patched ${patched} stray white pixels; ${remaining} remain`);
