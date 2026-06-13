# fe-dashboard — Acceptance

## Per-task criteria

| Task | Accepted when |
|---|---|
| T1 DashboardService | `listDevices`, `listAlerts`, `getMonitoringMetrics` each expose typed `.data`/`.loading`/`.error` signals; unit tests pass with mocked `Api`; no direct `api.invoke` calls anywhere else in the module |
| T2 Dashboard page | KPI cards render from device/alert signals; device table filters work client-side; fleet CPU ECharts chart renders with `period` selector; Register button opens sheet; socket `device:update` updates a row without full reload; `/fe-check` passes |
| T3 Devices list | All devices appear in DataTable; search narrows rows client-side; status filter works; KPI cards update with filtered counts; row click navigates to `/app/devices/{id}`; Register button opens sheet; `/fe-check` passes |
| T4 Monitoring page | Alerts DataTable renders with filter bar; bulk acknowledge/resolve fires correct API calls; ECharts alert trend bar chart renders; DateRangePicker triggers re-fetch; `/fe-check` passes |
| T5 RegisterDeviceSheet | Claim flow: submit deviceId → show token + instructions → copy to clipboard works; error shown for bad deviceId; closing sheet after success triggers parent device list reload; `/fe-check` passes |

## Module-level scenarios

```gherkin
Feature: Fleet overview dashboard

  Background:
    Given I am logged in as "operator@acme-iot.com"

  Scenario: Dashboard loads fleet KPIs
    When I navigate to "/app/dashboard"
    Then I see 4 KPI MetricCards
    And the "Online" card shows the correct count of online devices
    And the device table shows devices with status badges

  Scenario: Fleet CPU chart period change
    Given the Dashboard page is loaded
    When I select "7d" in the DateRangePicker
    Then the Fleet CPU chart reloads with 7-day data

  Scenario: Live alert prepended via socket
    Given the Dashboard page is loaded with the alerts feed visible
    When a new "alert:new" socket event arrives
    Then the new alert appears at the top of the feed without a page reload

  Scenario: Device status updates in real-time
    Given the Dashboard page is loaded
    When a "device:update" socket event arrives for a visible device
    Then that device row's status badge updates without a full reload

Feature: Devices list

  Scenario: Search narrows device table
    Given I am on "/app/devices"
    And the device table shows multiple devices
    When I type "pi-kitchen" in the search bar
    Then only devices matching "pi-kitchen" are shown

  Scenario: Status filter
    Given I am on "/app/devices"
    When I select "OFFLINE" in the status MultiSelectPicker
    Then only OFFLINE devices remain in the table

  Scenario: Navigate to device detail
    Given I am on "/app/devices"
    When I click on a device row
    Then I am navigated to "/app/devices/{id}"

Feature: Monitoring alerts

  Scenario: Filter alerts by severity
    Given I am on "/app/monitoring"
    And the alerts table shows mixed severities
    When I select "CRITICAL" in the severity filter
    Then only CRITICAL alerts are shown

  Scenario: Bulk acknowledge
    Given I am on "/app/monitoring"
    When I select 3 open alerts
    And I click "Acknowledge"
    Then a PATCH /monitoring/alerts/batch call is made with the 3 IDs
    And the alerts update to "acknowledged" state

Feature: Register device

  Scenario: Successful claim
    Given I click "Register device" on the Dashboard page
    And the RegisterDeviceSheet is open
    When I enter a valid device ID and click "Claim"
    Then I see the claiming token and copy button
    And closing the sheet reloads the device list

  Scenario: Invalid device ID
    Given the RegisterDeviceSheet is open
    When I enter an unrecognized device ID and click "Claim"
    Then I see an inline error message
```

## Parity checklist

| Legacy file | Behaviors to match |
|---|---|
| `components/dashboard.tsx` | Auth guard (ProtectedRoute); renders DeviceList as the main content |
| `components/device-list.tsx` | Loads devices via `listDevices`; respects `dashboardLayout` preference (compact/expanded/default grid); "Add Device" button navigates to add flow; renders hostname, type, status, IP |
| `app/devices/add/page.tsx` | Claim form: deviceId required, name optional; `POST /devices/claim`; shows token + expiry + instructions on success; copy token to clipboard |
| Prototype `DashboardView` | KPI cards; device table with DevicePicker + status filter; live alerts feed card; fleet CPU chart with period picker; "Register device" → sheet |
| Prototype `DevicesListView` | Search input; status filter; KPI cards (online/offline-error/maintenance-pending); DataTable with selectable rows |
| Prototype `MonitoringView` | Alerts DataTable; filter bar (device/severity/state/daterange); bulk actions; alert count badge in nav |

## Exit checklist (module → done)

- [ ] All 5 tasks merged and green in CI
- [ ] `docs/frontend/README.md` module row updated to `✅ done`
- [ ] Q1, Q2, Q3 resolved (spec fixes, ECharts installed)
- [ ] Shell nav rail `active` highlight works for `/app/dashboard`, `/app/devices`, `/app/monitoring`
- [ ] `fe-device-detail` can now be deepened (depends on `/app/devices/{id}` route existing)
