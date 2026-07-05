"use strict";

const { app, BrowserWindow, shell } = require("electron");
const path = require("path");

const { resolveSiteRoot } = require("./siteRoot");
const proto = require("./protocol");
const { buildMenu } = require("./menu");
const updater = require("./updater");

// Single instance — re-launching focuses the existing window.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

// Must run before app "ready".
proto.registerScheme();

let mainWindow = null;

function createWindow(siteRoot) {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 980,
    minHeight: 640,
    show: false, // revealed on ready-to-show to avoid a white startup flash
    backgroundColor: "#0b1016",
    title: "Certification Launchpad",
    icon: path.join(__dirname, "..", "assets", "icon.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // Paint the dark shell before showing, then reveal once content is ready.
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  buildMenu({ win: mainWindow, siteRoot, homeUrl: proto.homeUrl });
  mainWindow.loadURL(proto.homeUrl);

  // Open real external links (vendor objective pages, etc.) in the OS browser
  // rather than inside the app window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  const siteRoot = resolveSiteRoot();

  // Dev helper: generate assets/icon.ico from the brand mark, then quit.
  if (process.env.LAUNCHPAD_MKICON) {
    proto.registerHandler(siteRoot);
    require("./makeIcon").run(siteRoot).then(() => app.exit(0));
    return;
  }

  proto.registerHandler(siteRoot);
  createWindow(siteRoot);
  updater.initAutoUpdates(app);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(siteRoot);
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
