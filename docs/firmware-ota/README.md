# IoT Pilot Firmware & OTA — Project Charter

A **separate project** (its own repository and deployable) that owns firmware building,
artifact storage, signing, version cataloguing, and Over-The-Air (OTA) delivery to the
IoT Pilot fleet. `iotpilotserver` (the dashboard/backoffice) keeps only a thin device-side
representation and the *trigger* to request updates — it never builds, stores, or signs
firmware.

> These docs are the **seed of a new repo** (working name `iotpilot-firmware`). They live
> here during design because they reference `iotpilotserver` heavily and the repo doesn't
> exist yet. They move with the project when it's spun out. Style mirrors `docs/domain/`
> and `docs/frontend/` (scope / tasks / acceptance / open-questions per module).

## Why a separate project (decision)

Captured from the backend review (2026-06-10). The heavy firmware concerns do **not**
belong in the Next.js/Express dashboard:

- **Toolchain**: arduino-cli, esptool, board cores, cross-compilation — heavy, OS-specific deps that have no place in the dashboard image. Already isolated today as `scripts/flash-device*.sh`.
- **Signing & key custody**: firmware binaries must be signed; the dashboard process (customer-facing) must not hold signing keys. Distinct trust boundary.
- **Artifacts**: `.bin` blobs are large, immutable, versioned → object storage / CDN, not Prisma/Postgres.
- **Lifecycle & scaling**: firmware cadence follows hardware engineering, not the SaaS; OTA delivery is a CDN/bandwidth problem with a totally different scaling profile than the dashboard.

What stays in `iotpilotserver` (thin layer, see [integration-contract.md](integration-contract.md)):
the device aggregate's current/target firmware version, the admin UI to *view* status and
*request* an update, and a `RequestFirmwareUpdate` command that delegates to this service
via an anti-corruption-layer client. No binaries, no build, no signing keys.

## Feasibility verdict (grounded in the live DB — see [feasibility.md](feasibility.md))

OTA is feasible for **every device type currently in the database**, but via **two
different mechanisms** because the fleet splits into two connectivity classes:

| Class | Devices in DB | Reachability | OTA mechanism |
|---|---|---|---|
| **Linux hubs** (PI_ZERO/3/4/5, Orange Pi, Generic) | ~8 | Tailscale + SSH, mains power | **Pull or Push** — agent/package self-update; server can also push over SSH |
| **ESP sensors** (ESP8266, ESP32-C3, Heltec LoRa32 V3) | ~12 | Behind customer NAT, deep-sleep, HTTP outbound only | **Pull only** — device checks on wake and self-flashes (MCU image). Push is physically impossible |

"All remotely" — yes; "all the same way" — no. ESP sensors **cannot** be pushed to.

## OTA mechanism summary

**ESP sensors (pull, MCU image):** on wake the device reports as today; the report
response's existing `config` object is extended with a firmware directive
(`targetVersion`, signed `url`, `sha256`, `minBattery`). If `targetVersion != FIRMWARE_VERSION`
and battery is sufficient, the device downloads the signed `.bin` over HTTPS and self-flashes
via `ESP8266httpUpdate` / `HTTPUpdate` into the **inactive OTA slot**, verifies, then
reboots into it. A failed/partial download just retries next wake (no brick).
**Requires firmware changes** (OTA client + dual-app partition scheme) — not present today.

**Linux hubs (pull preferred, push capable):** the on-device agent polls for a newer
agent version and updates its package/binary/container; the server can also trigger via
the existing device command queue (the `UPDATE` command stub) over Tailscale SSH. This is
software/package update, not microcontroller flashing.

## Modules

Style: each module gets `scope.md` / `tasks.md` / `acceptance.md` / `open-questions.md`
(deepened just-in-time, like `docs/frontend/`). Estimates are rough dev-days.

| Module | Scope | Depends on | Est. | Status |
|---|---|---|---|---|
| fw-catalog | Firmware version catalog: releases, board compatibility, semver, changelog. The source of truth for "what version, for which board" | — | 4–6 | ⏳ deepen |
| fw-artifacts | Build pipeline (arduino-cli, per-board) + signed, immutable artifact storage (object store/CDN) + `sha256` + signature | fw-catalog | 6–10 | ⏳ deepen |
| fw-ota-api | Endpoints devices hit: "is there an update for me?" + signed binary URLs. Auth via device API key | fw-catalog, fw-artifacts | 4–6 | ⏳ deepen |
| fw-rollout | Progressive rollout: target by board/version/cohort/percentage, pause/resume, update-status tracking | fw-ota-api | 5–8 | ⏳ deepen |
| fw-device-esp | ESP firmware OTA client (HTTPUpdate) + dual-app OTA partition scheme + signature/version check + battery gate | fw-ota-api | 6–10 | ⏳ deepen |
| fw-device-hub | Pi/Linux agent self-update path (pull) + server-push fallback over SSH/Tailscale | fw-ota-api | 4–6 | ⏳ deepen |
| fw-integration | The `iotpilotserver`-side thin layer: persist current/target firmware version on the device aggregate, `RequestFirmwareUpdate` command, ACL client to this service, admin UI status. **Lands in iotpilotserver, not this repo** | fw-ota-api | 3–5 | ⏳ deepen |

**Rough total: 32–51 dev-days** for a first production OTA path (ESP + hub).

## Build order

1. **fw-catalog** + **fw-artifacts** — you can't deliver what you can't version and sign.
2. **fw-integration** (in iotpilotserver) — persist real firmware versions first (today they're only logged), so the dashboard reflects reality before any OTA.
3. **fw-ota-api** — the device-facing check/serve endpoints.
4. **fw-device-esp** — firmware changes (the longest pole; needs hardware testing).
5. **fw-device-hub** — agent self-update.
6. **fw-rollout** — progressive rollout once point-updates work.

## Non-goals (v1)

- No A/B firmware experimentation framework.
- No delta/differential OTA (full image only in v1).
- No LoRa-side OTA for the Heltec (Wi-Fi path only; LoRa is for sensor data).

## Related

- [feasibility.md](feasibility.md) — the live-DB + hardware analysis behind the verdict.
- [integration-contract.md](integration-contract.md) — the seam with `iotpilotserver` and the device-side protocol.
- `iotpilotserver/scripts/flash-device*.sh` — today's manual factory flashing (becomes the basis of fw-artifacts' build step; should call iotpilotserver's API, not its DB).
