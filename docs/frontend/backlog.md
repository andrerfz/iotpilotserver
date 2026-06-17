# Frontend backlog

Tasks that are scoped but not yet assigned to a module sprint.

## Pending

| # | Task | Module | Notes |
|---|---|---|---|
| 1 | **Export xlsx/pdf** | fe-dashboard / fe-admin | `onExportSelected()` in `devices.page.ts` is an empty stub. Admin-logs has CSV only. No xlsx/pdf implemented. |
| 2 | **Production cutover** | fe-cutover | SSH to prod: `git pull && docker compose pull && up -d`. Blocked on deployment decision. |
| 3 | **Dependency upgrades** | fe-foundation | Deprecated packages: `xterm` → `@xterm/xterm`, `eslint` v8 → v9 flat config, `rimraf` v3 → v5, `glob` v7 → v10. Separate PR. |
| 4 | **Zoneless change detection** | fe-foundation | Optional migration off Zone.js (`provideExperimentalZonelessChangeDetection`). Non-blocking. |
| 5 | **macOS Capacitor app + BLE device claiming** | fe-mobile | Add `ng-cap-build-macos` make target. Use `@capacitor-community/bluetooth-le` to scan for C3/Heltec sensors advertising over BLE in setup mode, replacing manual Device ID entry. Requires firmware changes on both sensor types. |
