// Minimal Electron shell for the IoT Pilot desktop provisioning app
// (fe-ble-claiming B1). Loads the built Angular app and enables Web Bluetooth.
// This is the desktop runtime chosen for P0.1 (Electron, for cross-OS reach).
const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');

// Angular's application builder may emit at www/ or www/browser/ depending on the
// outputPath config — support both.
function resolveIndex() {
  const candidates = [
    path.join(__dirname, '..', 'www', 'index.html'),
    path.join(__dirname, '..', 'www', 'browser', 'index.html'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || candidates[0];
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 820,
    title: 'IoT Pilot',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Web Bluetooth in Electron REQUIRES handling device selection in the main
  // process — without this, navigator.bluetooth.requestDevice() never resolves.
  //
  // ⚠ SECURITY (fe-ble-claiming Q3): this v1 auto-picks the first peripheral whose
  // name starts with "IotPilot-Setup", with NO operator consent. A rogue device can
  // advertise that name and would then receive the WiFi credentials the app writes.
  // Before real use this MUST become an operator-confirmed chooser (forward the
  // device list to the renderer over IPC) AND the GATT link must be encrypted/bonded
  // so the WiFi password isn't sent in the clear. Tracked in open-questions Q3.
  win.webContents.on('select-bluetooth-device', (event, devices, callback) => {
    event.preventDefault();
    const match = devices.find((d) => (d.deviceName || '').startsWith('IotPilot-Setup'));
    if (match) {
      callback(match.deviceId);
    }
    // else: leave the request pending until a matching device is discovered.
  });

  // Grant ONLY Bluetooth — deny every other permission (camera, mic, geolocation,
  // etc.). Never blanket-grant. (Security review: avoid over-broad permissions.)
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === 'bluetooth');
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(permission === 'bluetooth'));

  win.loadFile(resolveIndex());
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
