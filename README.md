# Certification Launchpad — Desktop Edition

## What this is

The offline desktop edition of The Certification Launchpad: the certification hub plus every certification study platform bundled into one installable Windows app. It wraps the web platforms in an Electron shell so students can study fully offline, with durable local progress and automatic updates.

## What this is not

This is not a separate set of study content. It bundles the existing web study platforms, and their material and licenses come from those projects. It is not a cross-platform release; the current build target is Windows.

## At a glance

- Platform: Windows desktop (Electron), packaged with electron-builder as an NSIS installer.
- Bundles: The Certification Launchpad hub plus every certification study platform.
- Offline-first, with durable local progress and automatic updates.
- Uses a `launchpad://` protocol and an embedded-with-override sync of the bundled sites.

## Features

- One installable app containing the hub and all study platforms.
- Fully offline study, with local progress that survives reinstalls.
- Automatic updates.
- A build and release pipeline that produces and publishes the Windows installer.

## How to use it

Install the app from the released Windows installer and launch it. Everything runs locally and offline, progress is stored on the machine, and updates install automatically.

## Run it locally

```
# from the repository root:
npm install
npm start        # syncs the bundled sites, then launches the app in Electron
```

## Project structure

- `src/` the Electron main and preload code and the app shell; `scripts/` the site-sync, icon, and release tooling; `assets/` icons and resources; `build/` and `release/` the packaging output.

## Building and releasing

- `npm run dist` builds the Windows installer with electron-builder.
- `npm run pack` builds an unpacked directory for testing.
- `npm run release` builds and publishes a GitHub release.

## License

Dual-licensed: the desktop wrapper code under the MIT License, and the bundled certification study platforms and their curriculum content under Creative Commons Attribution-NonCommercial-ShareAlike 4.0. See LICENSE.
