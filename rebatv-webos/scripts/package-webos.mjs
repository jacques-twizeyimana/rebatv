// Turns dist/ (from `vite build`) into an LG webOS .ipk in out/: adds appinfo.json (version taken
// from package.json) and the launcher icons, then runs ares-package from @webos-tools/cli.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const { version } = JSON.parse(readFileSync(root("package.json"), "utf8"));
const appinfo = JSON.parse(readFileSync(root("webos/appinfo.json"), "utf8"));
appinfo.version = version;

writeFileSync(root("dist/appinfo.json"), JSON.stringify(appinfo, null, 2) + "\n");
for (const f of ["icon.png", "largeIcon.png", "splash.png"]) copyFileSync(root(`webos/${f}`), root(`dist/${f}`));
mkdirSync(root("out"), { recursive: true });

// The bundle is already minified and transpiled for Chromium 53; don't let ares re-minify it.
execFileSync("ares-package", ["--no-minify", "--outdir", root("out"), root("dist")], { stdio: "inherit" });
console.log(`\nout/${appinfo.id}_${version}_all.ipk`);
