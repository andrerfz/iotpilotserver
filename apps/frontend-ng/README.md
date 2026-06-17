# frontend-ng — Angular/Ionic rewrite

Angular 20 + Ionic 8 rewrite of the IoT Pilot Console.
See [CLAUDE.md](CLAUDE.md) for architecture, conventions, and gotchas.

## Pending work

| # | Task | Notes |
|---|---|---|
| 1 | **Export xlsx/pdf** | `onExportSelected()` in `devices.page.ts` is an empty stub. Admin-logs has CSV only. No xlsx/pdf implemented yet. |
| 2 | **Production cutover (T6)** | SSH to prod, `git pull`, `docker compose pull && up -d`. Blocked waiting on deployment decision. |
| 3 | **Dependency upgrades** | Deprecated packages: `xterm` (use `@xterm/xterm`), `eslint` (v8 → v9 flat config), `rimraf` (v3 → v5), `glob` (v7 → v10). Separate PR. |
| 4 | **Zoneless change detection (T8)** | Optional migration off Zone.js. Non-blocking. |
| 5 | **macOS Capacitor app + BLE claiming** | Add `ng-cap-build-macos` make target. Use `@capacitor-community/bluetooth-le` to scan for C3/Heltec sensors advertising over BLE in setup mode, replacing manual Device ID entry. Requires firmware changes on both sensor types. |
