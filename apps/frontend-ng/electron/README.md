# IoT Pilot — Electron desktop shell

Desktop runtime for the BLE device-claiming app (fe-ble-claiming B1/B2). Chosen in
P0.1 over Mac Catalyst for cross-OS reach (macOS + Windows + Linux from one build).

It loads the standard Angular web build (`apps/frontend-ng/www`) in Electron's
Chromium, where **Web Bluetooth** (`navigator.bluetooth`) is available — so
`provideBle()` selects the `WebBluetoothBlePort` adapter automatically. `main.js`
handles `select-bluetooth-device` (mandatory in Electron) and grants the Bluetooth
permission.

## One-time setup

These dev dependencies are not yet in `package.json` (kept out until the desktop
build is exercised on a real machine). Add them where you build:

```bash
cd apps/frontend-ng
npm i -D electron electron-builder
```

(`apps/frontend-ng/.npmrc` sets `legacy-peer-deps=true`, so this resolves cleanly
despite the benign `@angular/build` ↔ `vitest@4` peer mismatch. The repo's source
of truth is the pnpm workspace; this npm path is for host-side desktop builds.)

## Run (dev)

```bash
npm run build                 # produces www/
npx electron electron/main.js # opens the desktop app
```

On a Mac, the system Bluetooth permission prompt appears on first scan. Power a
sensor into setup mode (advertises `IotPilot-Setup-XXXX`) and use
"Scan via Bluetooth" in the register flow.

## Package a distributable (.app / .exe / AppImage)

```bash
npm run build
npx electron-builder --config electron-builder.json --mac      # or --win / --linux
```

The built `.app` lands in `apps/frontend-ng/dist-electron/` — copy it to
`/Applications` to test. macOS distribution needs signing + notarization on a Mac
(Apple Developer cert); Windows needs a code-signing cert. See fe-ble-claiming D2.

## Known limitation (v1)

`select-bluetooth-device` auto-picks the first `IotPilot-Setup-*` peripheral it
sees. A renderer-side chooser for multiple in-range sensors (over an IPC bridge in
`preload.js`) is a follow-up — see fe-ble-claiming open-questions.
