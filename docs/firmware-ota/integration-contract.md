# Firmware OTA — Integration Contract

Defines the three seams: (1) `iotpilotserver` ↔ this firmware service, (2) firmware service
↔ devices (the OTA protocol), (3) what changes inside `iotpilotserver`. Anchored to the
existing report/`config` channel and device API-key auth confirmed in
[feasibility.md](feasibility.md).

## Seam 1 — iotpilotserver ↔ firmware service

`iotpilotserver` treats the firmware service as an external system behind an
anti-corruption layer (ACL client). It never reads the firmware service's storage and the
firmware service never reads iotpilotserver's DB.

**iotpilotserver → firmware service (control):**
- `GET /catalog/target?board={board}&channel={stable|beta}` → resolves the intended version + signed artifact URL + sha256 for a board. Used when iotpilotserver assembles a device's OTA directive, or proxied (see Seam 2 option B).
- `POST /rollouts` (admin-triggered `RequestFirmwareUpdate`) → starts/targets a rollout (board, version, cohort, percentage).

**firmware service → iotpilotserver (status, optional):**
- Webhook/event `firmware.update.completed|failed` keyed by device public ID, so the device aggregate's `firmwareVersion` reflects reality after an OTA. (Alternatively, iotpilotserver learns the new version from the device's next report — simpler, eventually consistent.)

Auth between services: service-to-service token (not user JWT, not device key).

## Seam 2 — firmware service ↔ devices (the OTA protocol)

### ESP sensors (pull, MCU image)

Reuses the **existing report → `config` response** channel (no new device endpoint for the
signal). The device already POSTs readings to its `webhookUrl` with `x-api-key` and parses
`config`. Extend the response:

```jsonc
{
  "config": {
    "reportingInterval": 7200,
    "deepSleepEnabled": true,
    "firmware": {                          // NEW — present only when an update targets this device
      "targetVersion": "2.1.0",
      "url": "https://fw-cdn.iotpilot.app/esp8266/2.1.0/firmware.bin?sig=...",  // signed, time-limited
      "sha256": "…",
      "minBattery": 30                      // skip if battery below this
    }
  }
}
```

Device-side algorithm (fw-device-esp):
1. On wake, report as today; read `config.firmware`.
2. If absent, or `targetVersion == FIRMWARE_VERSION`, or battery `< minBattery` → sleep as normal.
3. Else: `HTTPUpdate` the signed `url` into the **inactive** OTA slot; verify `sha256` + signature; on success switch slot and reboot; on any failure, stay on current slot and retry next wake.
4. After reboot, the next report carries the new `FIRMWARE_VERSION` → server observes success.

**Two delivery options for the signed URL** (open question, see fw-ota-api):
- *A — proxy:* iotpilotserver fetches the directive from the firmware service and embeds it in the `config` response it already sends. Devices only ever talk to iotpilotserver. Simplest device-side; iotpilotserver stays in the path.
- *B — direct:* the `url` points straight at the firmware service's CDN; the device fetches the binary directly. Offloads bandwidth from iotpilotserver; device must reach a second host.

### Linux hubs (pull preferred, push fallback)

- *Pull:* the agent calls `GET /catalog/target?board=linux-{arch}&channel=…` (direct or proxied), compares to its `agentVersion`, downloads + verifies + installs the package, restarts.
- *Push:* iotpilotserver issues the existing `UPDATE` device command over Tailscale SSH (command queue) instructing the agent to update now.

## Seam 3 — changes inside iotpilotserver (module fw-integration) — ✅ shipped

The iotpilotserver-side thin layer is implemented. It landed in `packages/core` + `apps/backend`, mirroring existing DDD:

1. **Persist firmware version — ✅ shipped.** The device record now carries `firmwareVersion` (current, reported by the device) and `targetFirmwareVersion` (desired, set by an admin) — both `String?` columns on `Device` in `apps/backend/prisma/schema.prisma`. The heartbeat path persists the reported `firmwareVersion` (`packages/core/src/device/application/commands/process-heartbeat/process-heartbeat.handler.ts`). _Note:_ the value is stored as a plain string; a dedicated `FirmwareVersion` (semver) VO in the device BC was **not** introduced — it remains optional future hardening.
2. **`RequestFirmwareUpdate` command — ✅ shipped.** `RequestFirmwareUpdateCommand` + handler in `packages/core/src/device/application/commands/request-firmware-update/` set `targetFirmwareVersion` on the device. Exposed as `POST /api/devices/:id/request-ota`, ADMIN/SUPERADMIN-gated (`requireAuth('ADMIN')`), tenant-scoped. It does **not yet** call an external firmware-service ACL client to start a rollout — that wiring is future work (Seam 1).
3. **OTA directive assembly (proxy / Seam 2 option A) — ✅ shipped.** The heartbeat handler injects `result.firmware = { targetVersion }` into the response when `targetFirmwareVersion` is set, so the device learns its target on the next heartbeat. The signed-`url`/`sha256`/`minBattery` fields described in Seam 2 are not yet populated — they depend on the external firmware service.
4. **Admin UI status** (frontend): show current vs target version per device and rollout progress. (Frontend lands via the `docs/frontend/` pipeline once those modules exist; data comes from the device aggregate + rollout status.) — still pending.

What does **not** change in iotpilotserver: no binaries, no build, no signing keys, no artifact storage.

> The external OTA service (Seam 1) and the device-side OTA protocol details (Seam 2 — signed artifact URLs, slot switching) remain future design. Only the iotpilotserver seam above is built.

## Security notes

- Artifacts are **signed**; devices verify signature + `sha256` before switching slots. Signing keys live only in the firmware service (never in iotpilotserver).
- Device-facing OTA endpoints authenticate with the **device API key** (same `x-api-key` the report path uses) and are tenant/device scoped.
- Signed binary URLs are time-limited.
- ESP OTA is fail-safe by design (inactive-slot write, verify-then-switch) — a bad or partial download cannot brick the device.
