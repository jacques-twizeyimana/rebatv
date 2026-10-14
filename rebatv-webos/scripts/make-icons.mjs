// Renders the LG launcher icons and splash screen into webos/ (committed, so packaging doesn't
// need this). Run after changing the brand mark: `pnpm icons`.
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const out = (name) => fileURLToPath(new URL(`../webos/${name}`, import.meta.url));

// Same mark as rebatv-web/src/app/icon.svg.
const mark = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0E0F0D"/>
  <text x="32" y="43" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="28" letter-spacing="-1.5" fill="#FAD201">TV</text>
</svg>`;

const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <rect width="1920" height="1080" fill="#0E0F0D"/>
  <text x="960" y="580" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="150" letter-spacing="-6"><tspan fill="#F3F1EA">reba</tspan><tspan fill="#FAD201">TV</tspan></text>
</svg>`;

await sharp(Buffer.from(mark(80))).png().toFile(out("icon.png"));
await sharp(Buffer.from(mark(130))).png().toFile(out("largeIcon.png"));
await sharp(Buffer.from(splash)).png().toFile(out("splash.png"));
console.log("Wrote webos/icon.png, webos/largeIcon.png, webos/splash.png");
