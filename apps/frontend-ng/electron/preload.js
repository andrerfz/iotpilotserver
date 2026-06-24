// Minimal preload. The renderer runs the standard Angular web build and talks to
// BLE via the Web Bluetooth API (navigator.bluetooth), so no bridge is needed yet.
// Reserved for a future device-chooser IPC bridge (multi-device selection).
window.addEventListener('DOMContentLoaded', () => {
  // no-op
});
