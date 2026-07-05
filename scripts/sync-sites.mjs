// Copy the Launchpad hub + every study site into build/sites so they can be
// bundled into the installer (or run via `electron .` in dev).
//
// Slugs are discovered from cert-hub's sites.js, so adding an exam there (and
// dropping its folder next to this project) means the desktop build picks it up
// automatically — no edit to this script required.

import { existsSync, mkdirSync, readFileSync, rmSync, cpSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const reposRoot = resolve(projectRoot, ".."); // C:\Users\rvira\GitHub
const outDir = join(projectRoot, "build", "sites");

const HUB = "cert-hub";
const sitesJsPath = join(reposRoot, HUB, "assets", "js", "content", "sites.js");

if (!existsSync(sitesJsPath)) {
  console.error("Cannot find sites.js at " + sitesJsPath);
  process.exit(1);
}

const sitesJs = readFileSync(sitesJsPath, "utf8");
const slugs = [...sitesJs.matchAll(/slug:\s*"([a-z0-9-]+)"/g)].map((m) => m[1]);
const all = [HUB, ...slugs];

// Files/dirs that are dev cruft, not needed in the shipped app.
const SKIP = new Set([".git", ".github", "node_modules", "PLAN.md", ".claude", "tools", "CLAUDE.md", "CLAUDE.local.md"]);

console.log("Syncing " + all.length + " sites -> build/sites");

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

let copied = 0;
const missing = [];
for (const slug of all) {
  const src = join(reposRoot, slug);
  if (!existsSync(src)) {
    missing.push(slug);
    continue;
  }
  cpSync(src, join(outDir, slug), {
    recursive: true,
    filter: (s) => {
      const base = s.split(/[\\/]/).pop();
      if (SKIP.has(base)) return false;
      if (/\.pdf$/i.test(base)) return false; // source exam PDFs are not shipped
      return true;
    }
  });
  copied++;
  console.log("  + " + slug);
}

if (missing.length) {
  console.warn("\nWARNING: missing site folders (skipped): " + missing.join(", "));
}
console.log("\nDone. " + copied + " sites in " + outDir);
