// Install or launch the packaged app on an LG TV in Developer Mode (see README).
//   pnpm install:tv            installs out/com.rebatv.tv_<version>_all.ipk
//   pnpm launch:tv             launches it
// The target is TV_DEVICE (a name from `ares-setup-device`), else the ares default device.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));
const { version } = JSON.parse(readFileSync(root("package.json"), "utf8"));
const { id } = JSON.parse(readFileSync(root("webos/appinfo.json"), "utf8"));
const device = process.env.TV_DEVICE ? ["--device", process.env.TV_DEVICE] : [];

const cmd = process.argv[2];
if (cmd === "install") {
  execFileSync("ares-install", [...device, root(`out/${id}_${version}_all.ipk`)], { stdio: "inherit" });
} else if (cmd === "launch") {
  execFileSync("ares-launch", [...device, id], { stdio: "inherit" });
} else {
  console.error("usage: node scripts/tv.mjs install|launch");
  process.exit(1);
}
