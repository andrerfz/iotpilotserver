# Firmware OTA — Feasibility Analysis

Grounded in the **live `iotpilotserver` database** and the actual firmware sources, as of
2026-06-10. This is the confirmation that OTA is possible with the products currently in
the fleet, and which OTA type each requires.

## Method

- Device inventory queried directly from the `devices` table (Postgres `iotpilot`).
- Connectivity attributes (`ipAddress`, `tailscaleIp`, `agentVersion`, `lastSeen`) aggregated per type.
- Firmware sources read: `firmware/esp8266-claiming-firmware/`, `esp32c3-claiming-firmware/`, `heltec-lora32v3-firmware/`.
- Board/flash from `scripts/flash-device*.sh` (fqbn).

## Live fleet (real data)

| deviceType | count | has ipAddress | has tailscaleIp | has agentVersion |
|---|---|---|---|---|
| PI_ZERO | 1 | 1 | 0 | 1 |
| PI_3 | 1 | 1 | 1 | 1 |
| PI_4 | 4 | 4 | 3 | 4 |
| PI_5 | 1 | 1 | 1 | 1 |
| ORANGE_PI | 1 | 1 | 1 | 1 |
| GENERIC | 1 | 1 | 0 | 1 |
| ESP8266_SENSOR | 9 | 2 | 0 | 3 |
| ESP32C3_SENSOR | 2 | 2 | 0 | 2 |
| HELTEC_LORA32V3_SENSOR | 1 | 1 | 0 | 1 |

Reported versions are already heterogeneous (e.g. PI_4 on both 2.4.1 and 2.4.0; ESP8266 on
blank / 1.0.0 / 2.0.0) — the exact condition that makes version-targeted OTA worthwhile.

## Two connectivity classes → two OTA mechanisms

### Class A — Linux hubs (Pi family, Orange Pi, Generic)

- **Reachability:** have `tailscaleIp` (most) and `agentVersion`; mains-powered; server reaches them today via SSH over Tailscale (this is what the `/devices/:id/ssh` and command queue already use).
- **"Firmware" = agent software** (a package/binary/container reporting `agentVersion` 2.3.x–2.4.x), not a microcontroller image.
- **OTA: pull or push.**
  - *Pull (preferred):* the agent polls "is there a newer agent for my arch?" and updates itself.
  - *Push (fallback):* server triggers update via the existing device command queue (the `UPDATE` command stub) over Tailscale SSH.
- **Feasible today** — the reachability and version channel already exist.

### Class B — ESP sensors (ESP8266, ESP32-C3, Heltec LoRa32 V3)

- **Reachability:** **no** `tailscaleIp`; behind customer NAT; **deep-sleep** between reports (`reportingInterval`, default config pushes to 7200 s = 2 h); only HTTP **outbound**. The firmware runs no listening server.
- **Push is physically impossible** — no inbound path, device asleep most of the time.
- **OTA: pull only, device-initiated, MCU image.**
- **Boards / flash:**
  - ESP8266 `d1_mini_clone` — 4 MB
  - ESP32-C3 `esp32:esp32:esp32c3` — 4 MB
  - Heltec `heltec_wifi_lora_32_V3` — 8 MB
  - Sketches are small (sensor reporting) → a dual-app OTA partition scheme fits comfortably. *Confirm exact app size and set the partition table at firmware-design time.*

## What already exists (half the pipe)

1. **Devices report their version.** ESP firmware sends `firmwareVersion` (compile constant `FIRMWARE_VERSION`) in every report; hubs report `agentVersion`. The server already knows what each device runs — it just **doesn't persist** `firmwareVersion` (only logs it). Fixing that is step 1 of `fw-integration`.
2. **A config channel back to the device.** ESP devices POST to their `webhookUrl` with an `x-api-key` header and parse a `config` object from the response (`reportingInterval`, `deepSleepEnabled`). This is the exact channel to carry the OTA directive — no new device endpoint needed for the *signal*.
3. **HTTPS support.** ESP firmware already uses a secure client when the URL starts with `https`.

## What's missing (the real build)

| Gap | Where | Effort |
|---|---|---|
| OTA client in ESP firmware (`ESP8266httpUpdate` / `HTTPUpdate`) | fw-device-esp | firmware eng. |
| Dual-app OTA partition scheme per board | fw-device-esp | firmware eng. |
| Signature + version verification on-device before switching slots | fw-device-esp | firmware eng. |
| Build pipeline + signed, immutable artifact store (CDN) | fw-artifacts | backend |
| Firmware version catalog (release, board compat, changelog) | fw-catalog | backend |
| Device-facing "update for me?" + signed-URL endpoints | fw-ota-api | backend |
| Persist `firmwareVersion`/`targetVersion` on the device aggregate | fw-integration (iotpilotserver) | small |

## Constraints & safety

- **Power (ESP):** download + flash + verify draws meaningful current. ESP OTA writes to the *inactive* slot and only switches after verifying, so a power loss mid-update is safe (device reboots into the old slot and retries next wake). Gate updates behind a `minBattery` field in the directive.
- **Cadence (ESP):** a device on a 2 h sleep interval will only pick up an update on its next wake — rollouts are eventually-consistent over hours, not seconds. Acceptable and expected; surface it in rollout status.
- **Bandwidth:** full-image OTA over customer Wi-Fi; fleet-wide rollouts should be paced (rollout module).
- **Heltec LoRa:** OTA is over **Wi-Fi**, not LoRa. LoRa remains the sensor-data path.

## Conclusion

OTA is viable for the entire current fleet. Linux hubs are ready at the connectivity level
(software/agent update, pull or push). ESP sensors need firmware work (OTA client +
partition scheme) but the surrounding protocol (version reporting + config response
channel + HTTPS) is already in place, and the hardware (4–8 MB flash, small sketches)
supports dual-slot OTA. No device type is excluded; only the **mechanism** differs by class.
