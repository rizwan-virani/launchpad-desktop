// Publish a GitHub Release for the built Windows installer.
//
// Assumes `npm run dist` has already produced the artifacts under release/.
// (`npm run release` runs dist first, then this.)
//
// It uploads the three electron-updater assets — the versioned installer, its
// .blockmap, and latest.yml — AND a stable, version-independent copy named
// `Certification-Launchpad-Setup.exe`. The cert-hub hero's one-click download
// button links to that stable name via `/releases/latest/download/…`, so it must
// be present on EVERY release or the button 404s. This script guarantees it.
//
// Requires the GitHub CLI (`gh`) to be installed and authenticated.

import { execSync } from "node:child_process";
import { existsSync, copyFileSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const releaseDir = join(projectRoot, "release");
const pkg = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8"));

const version = pkg.version;
const tag = "v" + version;
const pub = pkg.build && pkg.build.publish && pkg.build.publish[0];
if (!pub || pub.provider !== "github") {
  console.error("package.json build.publish[0] must be a github provider.");
  process.exit(1);
}
const repo = pub.owner + "/" + pub.repo;

const versionedExe = "Certification Launchpad Setup " + version + ".exe";
const blockmap = versionedExe + ".blockmap";
const latestYml = "latest.yml";
const stableExe = "Certification-Launchpad-Setup.exe"; // permanent one-click name

// 1. verify the build artifacts exist
for (const f of [versionedExe, blockmap, latestYml]) {
  if (!existsSync(join(releaseDir, f))) {
    console.error("Missing build artifact: release/" + f + "\nRun `npm run dist` first (or `npm run release`).");
    process.exit(1);
  }
}

// 2. make the stable-named copy the hub download button depends on
copyFileSync(join(releaseDir, versionedExe), join(releaseDir, stableExe));
console.log("Prepared stable asset: " + stableExe);

const DRY = process.argv.includes("--dry-run");
const q = (s) => '"' + s + '"';
const assets = [versionedExe, blockmap, latestYml, stableExe].map(q).join(" ");
const run = (cmd, opts = {}) => {
  if (DRY) { console.log("[dry-run] " + cmd); return; }
  return execSync(cmd, { cwd: releaseDir, stdio: "inherit", ...opts });
};

// 3. create the release, or replace assets on an existing one
let exists = false;
try { execSync("gh release view " + tag + " -R " + repo, { cwd: releaseDir, stdio: "ignore" }); exists = true; } catch (e) { exists = false; }

if (exists) {
  console.log("Release " + tag + " already exists — replacing assets (--clobber)…");
  run("gh release upload " + tag + " " + assets + " -R " + repo + " --clobber");
} else {
  const notes =
    "Windows installer for The Certification Launchpad — the offline desktop app " +
    "bundling the hub and all study platforms.\n\n" +
    "Download **Certification-Launchpad-Setup.exe** below and run it to install. " +
    "Installed copies auto-update to future releases.";
  const notesPath = join(releaseDir, "RELEASE_NOTES.md");
  writeFileSync(notesPath, notes);
  try {
    console.log("Creating release " + tag + "…");
    run("gh release create " + tag + " " + assets + " -R " + repo +
        " --title " + q("Certification Launchpad " + version) +
        " --notes-file " + q("RELEASE_NOTES.md"));
  } finally {
    rmSync(notesPath, { force: true });
  }
}

console.log("\nDone.");
console.log("  Release:       https://github.com/" + repo + "/releases/tag/" + tag);
console.log("  One-click DL:  https://github.com/" + repo + "/releases/latest/download/" + stableExe);
