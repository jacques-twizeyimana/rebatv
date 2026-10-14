import { transformAsync } from "@babel/core";
import preact from "@preact/preset-vite";
import { readFileSync } from "node:fs";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

// The local rebatv-web dev server (`pnpm dev` in ../rebatv-web).
const WEB = process.env.REBATV_WEB_URL || "http://localhost:3000";

/** Oldest engine we ship to: webOS 4.x (2018) runs Chromium 53. VIDAA U4+ is newer. */
const TARGET = { chrome: "53" };

/**
 * Lowers every module (ours and node_modules, e.g. hls.js) to Chromium 53 syntax and adds the
 * core-js polyfills the code actually uses. Runs after Vite's own TS/JSX transform.
 */
function legacyTv(): Plugin {
  return {
    name: "rebatv:babel-chrome53",
    apply: "build",
    enforce: "post",
    async transform(code, id) {
      // Skip virtual modules (e.g. the bundler's own runtime, which core-js itself depends on: adding
      // polyfill imports there creates a cycle and breaks start-up) and the polyfills themselves.
      if (id.charAt(0) === "\0" || !/\.[cm]?[jt]sx?(\?|$)/.test(id)) return null;
      if (/node_modules[\\/](core-js|@babel)[\\/]/.test(id)) return null;
      const out = await transformAsync(code, {
        babelrc: false,
        configFile: false,
        filename: id,
        sourceType: "unambiguous",
        compact: false,
        presets: [["@babel/preset-env", { targets: TARGET, modules: false, bugfixes: true, useBuiltIns: "usage", corejs: "3.50" }]],
      });
      return out && out.code != null ? { code: out.code, map: null } : null;
    },
  };
}

/**
 * The packaged webOS app loads from file://, which refuses <script type="module"> and any
 * script or stylesheet marked crossorigin. Ship one classic, deferred script instead.
 */
function classicScripts(): Plugin {
  return {
    name: "rebatv:classic-scripts",
    apply: "build",
    enforce: "post",
    transformIndexHtml: {
      order: "post",
      handler: (html) =>
        html
          .replace(/<script type="module" crossorigin/g, "<script defer")
          .replace(/<script type="module"/g, "<script defer")
          .replace(/ crossorigin(="[^"]*")?/g, ""),
    },
  };
}

export default defineConfig({
  // Relative asset URLs: the packaged webOS app loads from file://, the VIDAA build from /tv/.
  base: "./",
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [preact(), legacyTv(), classicScripts()],
  build: {
    target: "es2015",
    cssTarget: "chrome53",
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    modulePreload: false,
    sourcemap: false,
    // hls.js is most of the single bundle (~170 kB gzipped in total); expected.
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      // One self-contained classic script: no loader, no chunk requests over file://.
      output: { format: "iife", codeSplitting: false, entryFileNames: "assets/app-[hash].js" },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": WEB,
      "/hls": WEB,
      "/_next/image": WEB,
    },
  },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
