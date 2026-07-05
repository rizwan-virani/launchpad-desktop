"use strict";

/**
 * Resolve where the study-site files are served FROM.
 *
 * Precedence (first existing wins) — this is the "embedded with external
 * override" model:
 *   1. LAUNCHPAD_SITES env var (explicit override, handy for dev)
 *   2. a "sites" folder next to the installed .exe        (portable override)
 *   3. a "sites" folder in the app's userData directory   (per-user override)
 *   4. the copy bundled into the installer (resources/sites)
 *   5. the dev build folder (./build/sites) when running unpacked
 *
 * An override folder only needs to contain the site folders you want to
 * change — but in practice it replaces the whole sites root, so to add or
 * revise an exam you drop the full set (or copy the bundled one out and edit).
 */

const fs = require("fs");
const path = require("path");
const { app } = require("electron");

function firstExisting(candidates) {
  for (const dir of candidates) {
    if (dir && fs.existsSync(path.join(dir, "cert-hub"))) return dir;
  }
  return null;
}

function resolveSiteRoot() {
  const exeDir = path.dirname(app.getPath("exe"));

  const candidates = [
    process.env.LAUNCHPAD_SITES,
    path.join(exeDir, "sites"),
    path.join(app.getPath("userData"), "sites"),
    // packaged: electron-builder puts extraResources under process.resourcesPath
    path.join(process.resourcesPath || "", "sites"),
    // dev: `npm start` populates build/sites via sync-sites.mjs
    path.join(app.getAppPath(), "build", "sites")
  ];

  const root = firstExisting(candidates);
  if (!root) {
    throw new Error(
      "Could not locate the sites folder. Run `npm run sync` for dev, " +
        "or reinstall the app. Checked:\n" + candidates.filter(Boolean).join("\n")
    );
  }
  return root;
}

module.exports = { resolveSiteRoot };
