# fe-device-advanced — Acceptance

## Per-task criteria

| Task | Accepted when |
|---|---|
| T1 | `make ng-api-generate` runs cleanly after OpenAPI edits; `DeviceMetrics`, `MetricPoint`, `SshResult` types exist in generated models; service spec tests pass; `/fe-check` green |
| T2 | Navigating `/app/devices/:id/metrics`, `/app/devices/:id/terminal`, `/app/devices/:id/settings` renders stub content (not a 404 or blank); Terminal tab absent for a sensor device |
| T3 | Period selector changes reload chart data; picking a custom day range (optionally narrowed by start/end time) reloads with `startTime`/`endTime` instead of `period`; each MetricCard shows the last-series value with correct color; empty-series cards show "No data available"; Refresh button triggers a fresh load |
| T4 | Offline device shows EmptyState — no terminal rendered; online device shows "Connect Terminal" card; after connect, typing a command and pressing Enter appends `$ cmd` + response to the output; Clear wipes output; `executeSSH` called with correct `deviceId` and `command` |
| T5 | Form pre-fills with loaded settings; changing any General field marks form dirty and shows unsaved banner; Reset restores original values; Monitoring section shows correct controls for sensor vs system device type |
| T6 | Save calls `updateSettings` with current form values; Rotate Key shows new key inline + Copy works; Revoke SSH prompts confirmation then saves `sshEnabled: false`; Network+Agent fields save correctly; Security section hidden for sensor devices |

## Module-level scenarios

```gherkin
Feature: Device Metrics

  Scenario: View device metrics for default period
    Given I navigate to /app/devices/<online-device-id>/metrics
    Then I see 4 MetricCards (CPU, Memory, Disk, Temperature)
    And I see 4 line charts
    And the period selector shows "24h" as active

  Scenario: Change metrics period
    Given I am on the metrics tab
    When I open the period picker and select the "1h" preset
    Then the charts reload with 1h data
    And the period chip shows "1h" as active

  Scenario: Custom date+time range
    Given I am on the metrics tab
    When I open the period picker, click a start day and an end day, and set a start/end time
    Then the charts reload bounded to that exact start/end
    And the period chip shows the picked date range instead of a preset
    And chart axis labels show dates instead of time-of-day when the range spans 36h or more

  Scenario: No metrics data
    Given the device has no InfluxDB data
    When I view the metrics tab
    Then each chart shows "No data available"
    And MetricCards show "—"

Feature: SSH Terminal

  Scenario: Terminal blocked for offline device
    Given a device with status OFFLINE
    When I navigate to /app/devices/<id>/terminal
    Then I see "Device Offline" empty state
    And no terminal input is rendered

  Scenario: Execute command
    Given a device with status ONLINE
    And I have connected the terminal
    When I type "uptime" and press Enter
    Then the output area shows "$ uptime"
    And then shows the command output returned by the API

  Scenario: Clear terminal output
    Given the output area contains several lines
    When I click "Clear"
    Then the output area is empty

Feature: Device Settings

  Scenario: Load and display settings
    Given I navigate to /app/devices/<id>/settings
    Then the form shows the device hostname, type, location
    And the form shows monitoring settings matching the API response

  Scenario: Unsaved changes banner
    Given I am on the settings page
    When I change the device name field
    Then the unsaved changes banner appears
    When I click Reset
    Then the form reverts and the banner disappears

  Scenario: Save settings
    Given the settings form has unsaved changes
    When I click Save
    Then updateSettings is called with the current form values
    And the banner disappears

  Scenario: Rotate API key
    Given I am on the Security tab
    When I click "Rotate API Key" and confirm
    Then the new API key appears in the reveal card
    When I click "Copy"
    Then the key is copied to clipboard

  Scenario: Terminal tab hidden for sensor device
    Given a device with type "ESP32_C3"
    When I view the device detail tabs
    Then the Terminal tab is not visible

  Scenario: Sensor device monitoring section
    Given a device with type "HELTEC_V3"
    When I open the Monitoring section in settings
    Then I see the reporting interval quick-pick buttons
    And I see High Temperature and Battery Low threshold sliders
    And I do NOT see the CPU/Memory/Disk threshold sliders
```

## Parity checklist

| Legacy page | Behaviors to match |
|---|---|
| `DeviceMetricsPage.tsx` | Period selector (1h/6h/24h/7d); current-value MetricCards with thresholded colors; 4 recharts line charts → replaced by ECharts; Refresh button; loading + error states |
| `terminal/page.tsx` | Offline guard; "Connect Terminal" initial state; terminal renders on connect; back to device navigation via tab bar (no explicit Back button needed) |
| `ssh-terminal.tsx` | Command input; Send button (disabled while executing); output display with `$ cmd` prefix; Clear button; `isConnected` flag on first success |
| `DeviceSettingsPage.tsx` General | Hostname, type, location, description, tags (add/remove) form; read-only device details grid |
| `DeviceSettingsPage.tsx` Monitoring | metricsEnabled toggle; sensor vs system branching for intervals and thresholds |
| `DeviceSettingsPage.tsx` Network | IP + Tailscale IP read-only; networkMonitoring toggle |
| `DeviceSettingsPage.tsx` Agent | autoUpdate toggle; updateChannel select |
| `DeviceSettingsPage.tsx` Security | sshEnabled toggle; apiKeyRotationDays slider (365 = disabled label); Rotate Key flow; Revoke Access confirmation; hidden for sensor devices |

## Exit checklist (module → done)

- [ ] All tasks T1–T6 merged and green in CI
- [ ] README module table updated to `✅ done`
- [ ] Open questions Q1–Q4 all `_resolved_`
- [ ] fe-admin can now be deepened (no upstream dependency on fe-device-advanced, but fe-admin benefits from the established shell patterns)
- [ ] fe-mobile can now be deepened (all page modules done)
