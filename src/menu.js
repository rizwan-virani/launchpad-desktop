"use strict";

/**
 * Application menu. This is the main seam for adding desktop-only features
 * later (export/import progress, an "Open sites folder" override workflow,
 * future tools, etc.) without touching the web sites themselves.
 */

const { Menu, shell, dialog, app } = require("electron");
const progress = require("./progress");
const updater = require("./updater");

function buildMenu({ win, siteRoot, homeUrl }) {
  const template = [
    {
      label: "File",
      submenu: [
        {
          label: "Home (Launchpad)",
          accelerator: "CmdOrCtrl+H",
          click: () => win.loadURL(homeUrl)
        },
        { type: "separator" },
        {
          label: "Export study progress…",
          click: () => progress.exportProgress(win, siteRoot).catch((e) => dialog.showErrorBox("Export failed", String(e.message || e)))
        },
        {
          label: "Import study progress…",
          click: () => progress.importProgress(win, siteRoot).catch((e) => dialog.showErrorBox("Import failed", String(e.message || e)))
        },
        { type: "separator" },
        {
          label: "Open sites folder…",
          click: () => shell.openPath(siteRoot)
        },
        {
          label: "Where do content overrides go?",
          click: () => {
            dialog.showMessageBox(win, {
              type: "info",
              title: "Updating exam content",
              message: "How to revise or add exams",
              detail:
                "The app serves study content from:\n\n" +
                siteRoot +
                "\n\nTo override without reinstalling, create a folder named " +
                '"sites" next to the app executable (or in the app data ' +
                "folder) containing the site folders you want to change, then " +
                "restart. Add a new exam by dropping its folder and adding an " +
                "entry to cert-hub/assets/js/content/sites.js."
            });
          }
        },
        { type: "separator" },
        { role: "quit" }
      ]
    },
    {
      label: "View",
      submenu: [
        { label: "Reload", accelerator: "CmdOrCtrl+R", click: () => win.webContents.reloadIgnoringCache() },
        { role: "togglefullscreen" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "toggleDevTools" }
      ]
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Check for Updates…",
          click: () => updater.checkForUpdatesInteractive(app, win)
        },
        { type: "separator" },
        {
          label: "About Certification Launchpad",
          click: () => {
            dialog.showMessageBox(win, {
              type: "info",
              title: "About",
              message: "Certification Launchpad — Desktop Edition",
              detail:
                "Version " +
                app.getVersion() +
                "\nBy Professor Rizwan Virani.\n\n" +
                "An offline home base bundling the Launchpad hub and every " +
                "certification study platform into one installable app."
            });
          }
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

module.exports = { buildMenu };
