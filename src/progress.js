"use strict";

// Native File-menu progress backup/restore.
//
// In the desktop app every site shares the launchpad://app origin, so all sites'
// progress lives in one localStorage. We read/write it directly via
// executeJavaScript — no iframe bridge needed — and emit the SAME bundle format
// the hub uses ({ app, version, exported, sites: { <slug>: <data> } }), so files
// round-trip with the hub's own export/import.

const fs = require("fs");
const path = require("path");
const { dialog } = require("electron");

// slug -> progressKey, parsed from the bundled sites.js (stays data-driven, so
// exams added there are picked up automatically).
function readRegistry(siteRoot) {
  const sitesJs = path.join(siteRoot, "cert-hub", "assets", "js", "content", "sites.js");
  const text = fs.readFileSync(sitesJs, "utf8");
  const slugs = [...text.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);
  const keys = [...text.matchAll(/progressKey:\s*"([^"]+)"/g)].map((m) => m[1]);
  // sites.js lists slug then progressKey within each entry, in order.
  return slugs.map((slug, i) => ({ slug, progressKey: keys[i] })).filter((r) => r.progressKey);
}

async function exportProgress(win, siteRoot) {
  const registry = readRegistry(siteRoot);
  const script =
    "(function(reg){var b={app:'certification-launchpad',version:1,exported:new Date().toISOString(),sites:{}};" +
    "reg.forEach(function(r){try{var raw=localStorage.getItem(r.progressKey);if(raw){b.sites[r.slug]=JSON.parse(raw);}}catch(e){}});" +
    "return JSON.stringify(b,null,2);})(" +
    JSON.stringify(registry) +
    ")";

  const json = await win.webContents.executeJavaScript(script);
  const count = Object.keys(JSON.parse(json).sites).length;

  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: "Export study progress",
    defaultPath: "certification-launchpad-progress.json",
    filters: [{ name: "JSON", extensions: ["json"] }]
  });
  if (canceled || !filePath) return;

  fs.writeFileSync(filePath, json);
  dialog.showMessageBox(win, {
    type: "info",
    title: "Progress exported",
    message: "Backup saved",
    detail:
      "Saved progress for " +
      count +
      " exam" +
      (count === 1 ? "" : "s") +
      " to:\n" +
      filePath
  });
}

async function importProgress(win, siteRoot) {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: "Import study progress",
    properties: ["openFile"],
    filters: [{ name: "JSON", extensions: ["json"] }]
  });
  if (canceled || !filePaths || !filePaths[0]) return;

  let bundle;
  try {
    bundle = JSON.parse(fs.readFileSync(filePaths[0], "utf8"));
  } catch (e) {
    dialog.showErrorBox("Import failed", "That file isn't valid JSON.");
    return;
  }
  if (!bundle || !bundle.sites) {
    dialog.showErrorBox("Import failed", "That file isn't a Certification Launchpad backup.");
    return;
  }

  const confirm = await dialog.showMessageBox(win, {
    type: "warning",
    buttons: ["Cancel", "Import & overwrite"],
    defaultId: 1,
    cancelId: 0,
    title: "Import study progress",
    message: "Overwrite local progress with this backup?",
    detail: "Existing progress for the exams in the file will be replaced. This cannot be undone."
  });
  if (confirm.response !== 1) return;

  const registry = readRegistry(siteRoot);
  const script =
    "(function(reg,bundle){var n=0;reg.forEach(function(r){var d=bundle.sites[r.slug];" +
    "if(d!=null){try{localStorage.setItem(r.progressKey,JSON.stringify(d));n++;}catch(e){}}});return n;})(" +
    JSON.stringify(registry) +
    "," +
    JSON.stringify(bundle) +
    ")";

  const n = await win.webContents.executeJavaScript(script);
  win.webContents.reloadIgnoringCache();
  dialog.showMessageBox(win, {
    type: "info",
    title: "Progress imported",
    message: "Backup restored",
    detail: "Imported progress for " + n + " exam" + (n === 1 ? "" : "s") + "."
  });
}

module.exports = { exportProgress, importProgress, readRegistry };
