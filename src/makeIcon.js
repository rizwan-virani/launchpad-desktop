"use strict";

// Renders the Launchpad "CL" brand mark into assets/icon.ico.
// Invoked via: LAUNCHPAD_MKICON=1 electron .
//
// Loads the (known-good) launchpad:// home page, swaps the document for the
// brand mark via injected JS, then captures it — avoiding file:// / data: URLs
// (blocked here) and root-level protocol fetches (unreliable). The .ico
// container is written by hand (one PNG-compressed entry, valid on Vista+) so
// there is no ESM dependency to load in the main process.

const { BrowserWindow } = require("electron");
const proto = require("./protocol");
const fs = require("fs");
const path = require("path");

const SIZE = 256;

const INJECT = `
  document.documentElement.innerHTML =
    '<body style="margin:0;width:${SIZE}px;height:${SIZE}px;overflow:hidden">' +
    '<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 512 512">' +
    '<rect width="512" height="512" rx="104" fill="#0b1016"/>' +
    '<rect x="74" y="74" width="364" height="364" rx="80" fill="#34d5e6"/>' +
    '<text x="256" y="326" font-family="Segoe UI,sans-serif" font-size="190" ' +
    'font-weight="700" letter-spacing="2" text-anchor="middle" fill="#06121a">CL</text>' +
    '</svg></body>';
  true;
`;

function pngToIco(png) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(0, 0); // 0 => 256px
  entry.writeUInt8(0, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(6 + 16, 12);
  return Buffer.concat([header, entry, png]);
}

async function run() {
  const win = new BrowserWindow({
    width: SIZE,
    height: SIZE,
    frame: false,
    backgroundColor: "#0b1016",
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  const wc = win.webContents;
  // Wait on dom-ready (loadURL's promise can reject on aborted sub-resources);
  // the timeout is a safety net so this never hangs.
  const ready = new Promise((resolve) => {
    wc.once("dom-ready", resolve);
    setTimeout(resolve, 8000);
  });
  wc.loadURL(proto.homeUrl).catch(() => {});
  await ready;
  await wc.executeJavaScript(INJECT);
  await new Promise((r) => setTimeout(r, 300));
  const img = await wc.capturePage();
  const outIco = path.join(__dirname, "..", "assets", "icon.ico");
  fs.writeFileSync(outIco, pngToIco(img.toPNG()));
  console.log("ICON_OK " + outIco + " (" + img.getSize().width + "px)");
  win.destroy();
}

module.exports = { run };
