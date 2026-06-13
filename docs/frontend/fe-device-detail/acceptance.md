# fe-device-detail — Acceptance

## Per-task criteria

| Task | Accepted when |
|---|---|
| T1 | `make ng-api-generate` succeeds; `DeviceDetailService` is injectable; all 5 query surfaces return typed data/loading/error signals from mocked API; all 6 command methods call the correct generated-client operations; `/fe-check` passes (lint + type-check + tests) |
| T2 | Navigating to `/app/devices/RPI-001` renders device header with hostname + status badge + 6 tabs; DeviceOverviewPage shows 4 metric cards, device info KV, recent commands table; breadcrumb shows `Devices > {hostname}`; PENDING_SETUP banner renders with token + expiry for a pending device; layout does not break on narrow viewports |
| T3 | Commands page loads command list; polling updates the table every 5s; predefined command buttons dispatch with confirmation; custom command via CommandSheet sends `POST /devices/{id}/commands`; row click opens CommandSheet in detail mode; polling stops on component destroy |
| T4 | Logs page shows log entries; level/search/source filters reload the query; auto-refresh polls every 10s when enabled and stops when disabled or component is destroyed; pagination works; empty state renders when no logs match |
| T5 | Alerts page shows stats row + trend chart + filterable DataTable; ACK/Resolve single-row and bulk actions dispatch and reload the list; real-time `alert:new` socket event prepends a row without full reload; "Thresholds" button opens T6 sheet |
| T6 | ThresholdConfigSheet opens from Alerts page; loads existing thresholds for the device; scope selector toggles between device-scoped and global; saving calls createThreshold or updateThreshold depending on whether a threshold exists for that metric; sensor device shows sensor-specific fields |
| T7 | Network page displays device IP, Tailscale IP, hostname, WiFi quality; Storage page displays disk usage bars and KV grid; both auto-refresh when toggle is on; both show loading skeleton and error/empty state |

## Module-level scenarios

```gherkin
Feature: Device detail navigation

  Background:
    Given I am logged in as a USER
    And device "RPI-001" exists with status "ONLINE"

  Scenario: Open device detail from fleet list
    When I navigate to /app/devices
    And I click the row for device "RPI-001"
    Then I am at /app/devices/RPI-001
    And the page header shows "RPI-001" and an ONLINE status badge
    And the tab bar shows Overview, Alerts, Commands, Logs, Network, Storage

  Scenario: Navigate between tabs preserves the device header
    When I am at /app/devices/RPI-001
    And I click the "Alerts" tab
    Then I am at /app/devices/RPI-001/alerts
    And the device header is still visible
    And the Alerts tab is active

  Scenario: Deep link to a specific tab
    When I navigate directly to /app/devices/RPI-001/logs
    Then the device header loads
    And the Logs tab is active
    And log entries are visible

  Scenario: PENDING_SETUP banner
    Given device "RPI-002" has status "PENDING_SETUP" with a non-expired token
    When I navigate to /app/devices/RPI-002
    Then a banner is visible with the claiming token and expiry time
    When I click "Regenerate token"
    Then a new token is shown and the expiry resets

Feature: Commands

  Scenario: Issue a predefined command with confirmation
    Given I am at /app/devices/RPI-001/commands
    When I click the "REBOOT" quick action
    Then a confirmation dialog appears
    When I confirm
    Then POST /devices/RPI-001/commands is called with command=REBOOT
    And the command appears at the top of the list

  Scenario: Issue a custom command
    Given the CommandSheet is open in issue mode
    When I select "CUSTOM" and type "ls -la /tmp"
    And I submit
    Then POST /devices/RPI-001/commands is called with command=CUSTOM and the argument
    And the sheet closes

  Scenario: View command details
    Given the commands list shows an entry with status COMPLETED
    When I click that row
    Then the CommandSheet opens in detail mode showing exit code, output, and timestamps

Feature: Alerts

  Scenario: Acknowledge a single alert
    Given I am at /app/devices/RPI-001/alerts
    And there is an OPEN alert for this device
    When I click "Acknowledge" on that alert row
    Then PATCH /devices/RPI-001/alerts/{id} is called with action=acknowledge
    And the row state changes to ACK

  Scenario: Bulk resolve
    Given I am at /app/devices/RPI-001/alerts
    And 3 alerts are selected
    When I click "Resolve selected"
    Then PATCH is called for each selected alert with action=resolve
    And the 3 rows update to RESOLVED

  Scenario: Real-time alert arrives
    Given I am at /app/devices/RPI-001/alerts
    When the socket emits alert:new for this device
    Then the new alert appears at the top of the list without a full page reload

Feature: Threshold configuration

  Scenario: Create device-scoped threshold
    Given ThresholdConfigSheet is open for device "RPI-001" (system type)
    And no CPU threshold exists for this device
    When I set CPU to 90%
    And I click "Save"
    Then POST /monitoring/thresholds is called with deviceId=RPI-001 and metricName=cpu

  Scenario: Update existing threshold
    Given ThresholdConfigSheet is open
    And a CPU threshold at 80% already exists for this device
    When I change CPU to 95%
    And I click "Save"
    Then PUT /monitoring/thresholds/{id} is called with the new value
```

## Parity checklist

| Legacy page / component | Behaviors to match |
|---|---|
| `device-page.tsx` (overview) | Device header shows hostname, status badge, device ID, IP, location, firmware, uptime; refresh button reloads device + metrics; quick command button available; PENDING_SETUP token display with copy + regenerate |
| `device-nav.tsx` | All 6 tabs visible; active tab highlighted; tab for fe-device-advanced content (metrics/terminal/settings) is absent until that module lands |
| `DeviceCommandsPage.tsx` | Command list with columns: command, issued-by, status, when; auto-polls every 5s; predefined commands with confirmation; custom command with arguments; row click shows detail (output, exit code); loading/empty/error states |
| `DeviceLogsPage.tsx` | Level filter (ALL/DEBUG/INFO/WARN/ERROR/FATAL); search filter; source filter; auto-refresh toggle (10s); pagination with limit+offset; "Refresh" button; log level color-coded badge |
| `DeviceAlertsPage.tsx` (list section) | Stats cards (open/ack/resolved counts); 7-day trend bar chart; severity/state filter; ack/resolve per-row and bulk; real-time prepend on new alert |
| `DeviceAlertsPage.tsx` (threshold section) | Scope selector (device vs global); CPU/memory/temperature/disk sliders for system devices; sensor-temp/battery for sensor devices; save creates or updates existing threshold |
| `DeviceNetworkPage.tsx` | IP address, Tailscale IP, hostname, architecture, WiFi quality indicator; auto-refresh toggle; refresh button |
| `DeviceStoragePage.tsx` | Disk usage bars per partition; KV grid with total/used/free; auto-refresh; refresh button |

## Exit checklist (module → done)

- [ ] All 7 tasks merged and green in CI
- [ ] README module table updated to `done`
- [ ] All open questions `_resolved_`
- [ ] fe-device-advanced can now be deepened (its routing extension point is in `device-detail.routes.ts`)
- [ ] `DeviceTabNavComponent` is ready to receive Metrics/Terminal/Settings tab entries from fe-device-advanced
