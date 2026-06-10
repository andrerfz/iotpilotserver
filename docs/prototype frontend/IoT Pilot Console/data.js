/* ============================================================
   IoT Pilot Console — mock data + shared icon set
   Exposed on window for all babel scripts.
   ============================================================ */

(function () {
/* ---- Icons (Lucide-style strokes, single source) ---- */
const I = {
  dashboard: 'M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z',
  devices: 'M4 4h16v12H4zM2 20h20M9 16v4M15 16v4',
  cpu: 'M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3M7 7h10v10H7zM10 10h4v4h-4z',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  logs: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8M8 9h2',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z|M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z',
  layers: 'M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5',
  check: 'M20 6 9 17l-5-5',
  chevDown: 'M6 9l6 6 6-6',
  chevRight: 'M9 18l6-6-6-6',
  chevLeft: 'M15 18l-6-6 6-6',
  x: 'M18 6 6 18M6 6l12 12',
  plus: 'M12 5v14M5 12h14',
  filter: 'M22 3H2l8 9.46V19l4 2v-8.54L22 3Z',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  arrowDown: 'M12 5v14M19 12l-7 7-7-7',
  wifi: 'M5 12.55a11 11 0 0 1 14 0M8.5 16.1a6 6 0 0 1 7 0M2 8.82a15 15 0 0 1 20 0M12 20h.01',
  wifiOff: 'M2 8.82a15 15 0 0 1 4.17-2.65M10.66 5A15 15 0 0 1 22 8.82M16.85 11.25a10 10 0 0 1 2.22 1.68M5 12.55a11 11 0 0 1 5.17-2.39M10.71 19.71a1 1 0 0 0 2.58 0M2 2l20 20',
  thermo: 'M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0Z',
  mem: 'M6 19v-3M10 19v-3M14 19v-3M18 19v-3M8 5h8a2 2 0 0 1 2 2v6H6V7a2 2 0 0 1 2-2ZM4 13h16v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2Z',
  hdd: 'M22 12H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11ZM6 16h.01M10 16h.01',
  terminal: 'M4 17l6-6-6-6M12 19h8',
  mapPin: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0ZM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2',
  zap: 'M13 2 3 14h9l-1 8 10-12h-9l1-8Z',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  more: 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  play: 'M5 3l14 9-14 9V3Z',
  power: 'M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z',
  alert: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0ZM12 9v4M12 17h.01',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 16v-4M12 8h.01',
  trend: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
  link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  command: 'M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3Z',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  frame: 'M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M3 16v3a2 2 0 0 0 2 2h3',
};

/* ---- Devices ---- */
const STATUS = ['ONLINE','OFFLINE','MAINTENANCE','ERROR','PENDING_SETUP'];
const DEVICES = [
  { id: 'dev_a1f93c', name: 'edge-gw-madrid-01', type: 'Gateway',  hw: 'Heltec LoRa32 V3', status: 'ONLINE', ip: '10.40.2.11', loc: 'Madrid · Nave A', cpu: 34, mem: 61, temp: 47, disk: 52, up: '18d 04h', fw: '2.4.1', last: '12s' },
  { id: 'dev_c7820e', name: 'sensor-cold-room-3', type: 'Sensor',  hw: 'ESP32-C3',        status: 'ONLINE', ip: '10.40.2.34', loc: 'Madrid · Cámara 3', cpu: 12, mem: 28, temp: 4, disk: 19, up: '42d 11h', fw: '2.4.1', last: '4s' },
  { id: 'dev_4be102', name: 'edge-gw-bcn-02',    type: 'Gateway',  hw: 'Heltec LoRa32 V3', status: 'MAINTENANCE', ip: '10.41.1.8', loc: 'Barcelona · DC', cpu: 0, mem: 0, temp: 0, disk: 44, up: '—', fw: '2.3.9', last: '6m' },
  { id: 'dev_9d3a77', name: 'sensor-temp-roof-1', type: 'Sensor',  hw: 'ESP8266',         status: 'ERROR', ip: '10.41.1.52', loc: 'Barcelona · Cubierta', cpu: 88, mem: 94, temp: 71, disk: 81, up: '2d 09h', fw: '2.2.0', last: '1m' },
  { id: 'dev_2ef510', name: 'edge-gw-sevilla-01', type: 'Gateway', hw: 'Heltec LoRa32 V3', status: 'ONLINE', ip: '10.42.0.4', loc: 'Sevilla · Planta', cpu: 41, mem: 55, temp: 51, disk: 63, up: '7d 22h', fw: '2.4.1', last: '9s' },
  { id: 'dev_88c0d1', name: 'sensor-humid-wh-7',  type: 'Sensor',  hw: 'ESP32-C3',        status: 'ONLINE', ip: '10.42.0.31', loc: 'Sevilla · Almacén', cpu: 19, mem: 33, temp: 38, disk: 22, up: '15d 02h', fw: '2.4.1', last: '21s' },
  { id: 'dev_5a7b3f', name: 'edge-gw-valencia',   type: 'Gateway', hw: 'Heltec LoRa32 V3', status: 'OFFLINE', ip: '10.43.2.2', loc: 'Valencia · Puerto', cpu: 0, mem: 0, temp: 0, disk: 58, up: '—', fw: '2.4.0', last: '3h' },
  { id: 'dev_f10e9a', name: 'sensor-door-bay-12', type: 'Sensor',  hw: 'ESP8266',         status: 'ONLINE', ip: '10.43.2.18', loc: 'Valencia · Muelle 12', cpu: 8, mem: 22, temp: 35, disk: 14, up: '60d 18h', fw: '2.4.1', last: '7s' },
  { id: 'dev_3c6d12', name: 'edge-gw-bilbao-01',  type: 'Gateway', hw: 'Heltec LoRa32 V3', status: 'PENDING_SETUP', ip: '—', loc: 'Bilbao · Nuevo', cpu: 0, mem: 0, temp: 0, disk: 0, up: '—', fw: '2.4.1', last: '—' },
  { id: 'dev_7e22b8', name: 'sensor-vibr-mill-4', type: 'Sensor',  hw: 'ESP32-C3',        status: 'ONLINE', ip: '10.44.1.9', loc: 'Bilbao · Molino 4', cpu: 27, mem: 44, temp: 49, disk: 30, up: '9d 06h', fw: '2.4.1', last: '15s' },
];

/* ---- Alerts ---- */
const ALERTS = [
  { id: 'al_5512', sev: 'critical', title: 'Memory usage above 90%', device: 'sensor-temp-roof-1', devId: 'dev_9d3a77', metric: 'memory', value: '94%', threshold: '90%', state: 'OPEN', ts: '2026-06-10 09:41:22', age: '6m' },
  { id: 'al_5510', sev: 'critical', title: 'Device unreachable', device: 'edge-gw-valencia', devId: 'dev_5a7b3f', metric: 'connectivity', value: 'offline', threshold: '—', state: 'OPEN', ts: '2026-06-10 06:58:03', age: '3h' },
  { id: 'al_5509', sev: 'warning', title: 'CPU temperature high', device: 'sensor-temp-roof-1', devId: 'dev_9d3a77', metric: 'temperature', value: '71°C', threshold: '65°C', state: 'OPEN', ts: '2026-06-10 09:30:11', age: '17m' },
  { id: 'al_5505', sev: 'warning', title: 'Disk usage above 80%', device: 'sensor-temp-roof-1', devId: 'dev_9d3a77', metric: 'disk', value: '81%', threshold: '80%', state: 'ACK', ts: '2026-06-10 08:12:55', age: '1h' },
  { id: 'al_5501', sev: 'info', title: 'Firmware update available', device: 'edge-gw-bcn-02', devId: 'dev_4be102', metric: 'firmware', value: '2.4.1', threshold: '—', state: 'ACK', ts: '2026-06-10 07:40:18', age: '2h' },
  { id: 'al_5498', sev: 'warning', title: 'Heartbeat interval drift', device: 'edge-gw-sevilla-01', devId: 'dev_2ef510', metric: 'heartbeat', value: '46s', threshold: '30s', state: 'OPEN', ts: '2026-06-10 05:22:40', age: '4h' },
  { id: 'al_5490', sev: 'info', title: 'Device claimed successfully', device: 'sensor-vibr-mill-4', devId: 'dev_7e22b8', metric: 'lifecycle', value: 'claimed', threshold: '—', state: 'RESOLVED', ts: '2026-06-09 18:03:12', age: '15h' },
  { id: 'al_5487', sev: 'critical', title: 'Temperature out of range', device: 'sensor-cold-room-3', devId: 'dev_c7820e', metric: 'temperature', value: '11°C', threshold: '8°C', state: 'RESOLVED', ts: '2026-06-09 14:51:07', age: '19h' },
];

/* ---- Users ---- */
const USERS = [
  { id: 'usr_001', name: 'Lucía Fernández', email: 'lucia@acme-iot.com', role: 'ADMIN', status: 'ACTIVE', last: '2m', hue: 217 },
  { id: 'usr_002', name: 'Marc Oller', email: 'marc@acme-iot.com', role: 'OPERATOR', status: 'ACTIVE', last: '18m', hue: 142 },
  { id: 'usr_003', name: 'Sofía Romero', email: 'sofia@acme-iot.com', role: 'OPERATOR', status: 'ACTIVE', last: '1h', hue: 38 },
  { id: 'usr_004', name: 'David Núñez', email: 'david@acme-iot.com', role: 'VIEWER', status: 'PENDING', last: '—', hue: 280 },
  { id: 'usr_005', name: 'Aitor Vidal', email: 'aitor@acme-iot.com', role: 'ADMIN', status: 'ACTIVE', last: '3h', hue: 0 },
  { id: 'usr_006', name: 'Carla Méndez', email: 'carla@partner.io', role: 'VIEWER', status: 'SUSPENDED', last: '6d', hue: 199 },
  { id: 'usr_007', name: 'Pablo Iglesias', email: 'pablo@acme-iot.com', role: 'OPERATOR', status: 'PENDING', last: '—', hue: 260 },
];

/* ---- Logs ---- */
const LOGS = [
  { ts: '2026-06-10 09:47:02.118', lvl: 'info',  msg: 'heartbeat received cpu=34% mem=61% temp=47°C', dev: 'edge-gw-madrid-01' },
  { ts: '2026-06-10 09:46:58.402', lvl: 'debug', msg: 'mqtt publish topic=telemetry/dev_a1f93c qos=1', dev: 'edge-gw-madrid-01' },
  { ts: '2026-06-10 09:46:41.770', lvl: 'warn',  msg: 'threshold breach memory=94% > 90% on sensor-temp-roof-1', dev: 'sensor-temp-roof-1' },
  { ts: '2026-06-10 09:45:12.009', lvl: 'error', msg: 'connection lost peer=10.43.2.2 retry=3 backoff=8s', dev: 'edge-gw-valencia' },
  { ts: '2026-06-10 09:44:55.331', lvl: 'info',  msg: 'command dispatched id=cmd_77a1 type=REBOOT', dev: 'edge-gw-bcn-02' },
  { ts: '2026-06-10 09:44:03.882', lvl: 'debug', msg: 'session refresh token rotated ttl=3600s', dev: 'edge-gw-madrid-01' },
  { ts: '2026-06-10 09:43:20.554', lvl: 'info',  msg: 'telemetry batch flushed points=240 influx=ok', dev: 'sensor-cold-room-3' },
  { ts: '2026-06-10 09:42:11.097', lvl: 'warn',  msg: 'heartbeat drift detected interval=46s expected=30s', dev: 'edge-gw-sevilla-01' },
  { ts: '2026-06-10 09:41:22.640', lvl: 'error', msg: 'alert raised id=al_5512 severity=critical metric=memory', dev: 'sensor-temp-roof-1' },
  { ts: '2026-06-10 09:40:09.215', lvl: 'info',  msg: 'device claim verified hwid=E8:DB:84:C1:0A:7F', dev: 'sensor-vibr-mill-4' },
  { ts: '2026-06-10 09:39:51.448', lvl: 'debug', msg: 'ssh keepalive sent channel=0 bytes=32', dev: 'edge-gw-madrid-01' },
  { ts: '2026-06-10 09:38:44.902', lvl: 'info',  msg: 'metrics scrape ok targets=9 duration=412ms', dev: 'system' },
];

/* ---- Time series (sparkline / chart) ---- */
function series(seed, n, base, amp) {
  const out = []; let v = base;
  for (let i = 0; i < n; i++) {
    const r = Math.sin((i + seed) * 0.7) * amp + (Math.sin((i + seed) * 2.3) * amp * 0.4);
    v = Math.max(2, Math.min(99, base + r));
    out.push(Math.round(v));
  }
  return out;
}
const SERIES = {
  cpu: series(1, 32, 36, 16),
  mem: series(4, 32, 58, 12),
  temp: series(7, 32, 47, 7),
  net: series(2, 32, 45, 22),
  fleetCpu: series(9, 24, 40, 18),
  alertsTrend: series(3, 14, 6, 4),
};

/* KPIs */
const KPI = {
  online: 7, total: 10, openAlerts: 4, avgCpu: 28, throughput: '1.2k',
};

window.IOT = { I, DEVICES, ALERTS, USERS, LOGS, SERIES, KPI, STATUS };
})();
