"use strict";

/**
 * The launchpad:// protocol handler.
 *
 * All bundled sites are served from ONE origin (launchpad://app/...). Because the
 * host is "app" (not localhost), each site's resolveSiteUrl() falls into its
 * deployed-mode branch and links to siblings as ../<slug>/ — exactly like
 * GitHub Pages. That keeps the desktop build a zero-diff consumer of the sites
 * and keeps the cross-site progress bridge (postMessage + localStorage) working
 * because every site shares the launchpad://app origin.
 */

const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const { protocol, net } = require("electron");

const SCHEME = "launchpad";
const HOST = "app";

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain",
  ".map": "application/json"
};

function mimeFor(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

// Register the scheme as privileged. Service workers are intentionally OFF:
// inside the app every asset is already local, so an in-app SW would only add
// the stale-cache failure mode we have hit before.
function registerScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        allowServiceWorkers: false,
        stream: true
      }
    }
  ]);
}

function withinRoot(root, target) {
  const rel = path.relative(root, target);
  return rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function registerHandler(siteRoot) {
  protocol.handle(SCHEME, async (request) => {
    const url = new URL(request.url);

    // launchpad://app/<path>  — anything off-host is rejected.
    if (url.hostname !== HOST) {
      return new Response("Not found", { status: 404 });
    }

    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    if (pathname === "" || pathname === "/") pathname = "/index.html";

    // Neutralize service-worker requests so no site can register one in-app.
    if (path.basename(pathname) === "sw.js") {
      return new Response("/* service worker disabled in desktop app */", {
        status: 200,
        headers: { "content-type": "text/javascript", "cache-control": "no-store" }
      });
    }

    const filePath = path.normalize(path.join(siteRoot, pathname));
    if (!withinRoot(siteRoot, filePath)) {
      return new Response("Forbidden", { status: 403 });
    }

    try {
      if (!fsSync.existsSync(filePath)) {
        return new Response("Not found: " + pathname, { status: 404 });
      }
      const data = await fs.readFile(filePath);
      return new Response(data, {
        status: 200,
        headers: {
          "content-type": mimeFor(filePath),
          // Local files; never let the renderer cache a stale copy.
          "cache-control": "no-store"
        }
      });
    } catch (err) {
      return new Response("Error: " + err.message, { status: 500 });
    }
  });
}

module.exports = {
  SCHEME,
  HOST,
  homeUrl: `${SCHEME}://${HOST}/cert-hub/index.html`,
  registerScheme,
  registerHandler
};
