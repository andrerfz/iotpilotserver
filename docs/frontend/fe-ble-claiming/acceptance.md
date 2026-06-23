# fe-ble-claiming — Acceptance

## Per-task acceptance

| # | Acceptance |
|---|---|
| P0.1 | A spike on the chosen runtime scans, connects, and writes a GATT characteristic to a real BLE peripheral on macOS. Decision recorded in open-questions Q1. |
| P0.2 | NimBLE-enabled C3 build compiles; program-flash usage reported. Verdict (fits / fits-with-partition / does-not-fit) recorded in Q2. |
| A1 | GATT contract documented (service + characteristic UUIDs, payload shapes, `status` enum) and referenced from both firmware READMEs. |
| A2 | A C3 in setup mode advertises the service with its `deviceId`; a generic BLE scanner sees it and can connect to the GATT server. |
| A3 | Writing `{ssid,password,claimingToken}` + `activate` makes the C3 join WiFi, activate against the backend, and emit `ACTIVATED` (or `ERROR_*`) on the `status` characteristic; `apiKey`/`webhookUrl` persisted in NVS as in the portal flow. |
| A4 | A3 acceptance holds on Heltec LoRa32 V3. |
| A5 | After a failed WiFi attempt the device re-enters BLE setup; a setup-mode timeout falls back to the AP portal; deep-sleep reporting works post-claim. |
| B1 | `make ng-cap-build-macos` produces a runnable macOS app of the current frontend-ng. |
| B2 | The macOS app prompts for / holds Bluetooth permission and the bluetooth-le plugin initializes without error. |
| C1 | `BleProvisioningService` unit tests pass with a fake plugin (scan→connect→write→status); no real BLE needed in CI. |
| C2 | An authenticated operator can obtain a valid `claimingToken` for a pre-registered scanned `deviceId` via the API. |
| C3 | The register-device flow offers "Scan via Bluetooth", lists discovered sensors, and provisions a picked one; manual entry remains for ESP8266/fallback. |
| C4 | Provisioning progress reflects the BLE `status` notifications and the device shows ONLINE in the list without a manual refresh. |
| D1 | Happy path + the failure modes in tasks D1 all behave correctly on real C3 (if in scope) and Heltec hardware. |
| D2 | CI produces a signed/notarized macOS artifact. |

## Scenarios (Gherkin)

```gherkin
Feature: Claim a sensor over BLE from the macOS app

  Scenario: Happy path — provision a discovered sensor
    Given an unclaimed ESP32-C3 sensor powered on in setup mode
    And an operator logged into the macOS app for their tenant
    When the operator scans via Bluetooth
    Then the sensor appears in the discovered list by its device ID
    When the operator selects it and provides WiFi credentials
    Then the app fetches a claiming token for that device
    And writes the credentials and token to the sensor over BLE
    And the sensor connects to WiFi and activates against the backend
    And the app shows the sensor coming ONLINE without manual entry

  Scenario: Wrong WiFi password
    Given a sensor is being provisioned over BLE
    When the WiFi credentials are incorrect
    Then the sensor reports an ERROR status over BLE
    And the app shows a WiFi-failure message and lets the operator retry
    And the sensor remains discoverable over BLE (not stranded)

  Scenario: Expired or invalid claiming token
    Given a sensor received valid WiFi but an expired token
    When it attempts activation
    Then activation fails and the sensor reports the error over BLE
    And the app surfaces "token expired" and offers to reissue

  Scenario: ESP8266 (no BLE) falls back
    Given the operator scans and no BLE sensor is found
    Then the app offers manual Device-ID entry (the existing AP/portal flow)

  Scenario: Two sensors in range
    Given two unclaimed sensors advertise in setup mode
    Then both appear in the list distinguished by device ID
    And provisioning one does not affect the other
```

## Module-done definition

`fe-ble-claiming` is done when: an operator can claim a Heltec sensor (and a C3 if
Q2 allowed it) end-to-end over BLE from a signed macOS build, the failure modes
above are handled, `BleProvisioningService` is unit-tested, and the firmware GATT
contract is documented. Then flip this module to ✅ in `docs/frontend/README.md`.
