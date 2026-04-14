-- =====================================================
-- REALISTIC SEED DATA FOR IOT PILOT
-- Run: docker exec -i iotpilot-server-postgres psql -U iotpilot -d iotpilot < app/prisma/seed-demo-data.sql
-- =====================================================
-- Demo credentials:
--   Admin:    admin@acme-iot.com    / DemoAdmin123!
--   Operator: operator@acme-iot.com / DemoAdmin123!
--   SuperAdmin: manager@iotpilot.app (pre-existing)
-- =====================================================

-- Customer (CUID format required by CustomerId value object)
INSERT INTO customers (id, name, slug, "subscriptionTier", status, "createdAt", "updatedAt")
VALUES ('cnmapo7auxgbpzt08o3d88q07', 'Acme IoT Solutions', 'acme-iot', 'PRO', 'ACTIVE', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Users (bcrypt hash for "DemoAdmin123!" with cost 12)
INSERT INTO users (id, email, username, password, role, "customerId", "createdAt", "updatedAt")
VALUES
  ('cm9g1p73t2b1jzwv4o49rmd1z', 'admin@acme-iot.com', 'admin-acme', '$2a$12$D1lD8nFkpa2n1l2Y8.J0SuVP0eV/mZ2QOPYKFoZSGuB6ftsLVoIwi', 'ADMIN', 'cnmapo7auxgbpzt08o3d88q07', NOW(), NOW()),
  ('cupu6zg5yura4gn6xgod95qn6', 'operator@acme-iot.com', 'operator-acme', '$2a$12$D1lD8nFkpa2n1l2Y8.J0SuVP0eV/mZ2QOPYKFoZSGuB6ftsLVoIwi', 'USER', 'cnmapo7auxgbpzt08o3d88q07', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Devices (8 devices with varied statuses)
INSERT INTO devices (id, "deviceId", name, hostname, "deviceType", "deviceModel", architecture, location, description, "ipAddress", "tailscaleIp", "macAddress", status, "lastSeen", "lastBoot", uptime, "cpuUsage", "cpuTemp", "memoryUsage", "memoryTotal", "diskUsage", "diskTotal", "loadAverage", "appStatus", "agentVersion", "userId", "customerId", "registeredAt", "updatedAt")
VALUES
  ('dev-001', 'rpi-srv-room-01', 'Server Room Monitor', 'rpi-srvroom-01', 'PI_4', 'Raspberry Pi 4 Model B 8GB', 'aarch64', 'Server Room A - Rack 3', 'Monitors temperature, humidity and power in main server room', '192.168.1.10', '100.64.0.10', 'DC:A6:32:AA:11:01', 'ONLINE', NOW() - INTERVAL '2 minutes', NOW() - INTERVAL '45 days', '45d 12h 33m', 23.5, 42.1, 34.2, 8192, 28.7, '64GB', '0.45 0.38 0.32', 'RUNNING', '2.4.1', 'cm9g1p73t2b1jzwv4o49rmd1z', 'cnmapo7auxgbpzt08o3d88q07', NOW() - INTERVAL '90 days', NOW()),

  ('dev-002', 'rpi-warehouse-01', 'Warehouse Climate Controller', 'rpi-warehouse-01', 'PI_4', 'Raspberry Pi 4 Model B 4GB', 'aarch64', 'Warehouse B - Zone 2', 'Climate monitoring and HVAC control relay for cold storage', '192.168.1.20', '100.64.0.20', 'DC:A6:32:BB:22:02', 'ONLINE', NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '12 days', '12d 8h 15m', 15.8, 38.5, 42.1, 4096, 35.4, '32GB', '0.22 0.18 0.15', 'RUNNING', '2.4.1', 'cm9g1p73t2b1jzwv4o49rmd1z', 'cnmapo7auxgbpzt08o3d88q07', NOW() - INTERVAL '60 days', NOW()),

  ('dev-003', 'rpi-office-01', 'Office Environment Sensor', 'rpi-office-main', 'PI_3', 'Raspberry Pi 3 Model B+', 'armv7l', 'Main Office - Floor 2', 'Air quality, temperature and occupancy monitoring', '192.168.1.30', '100.64.0.30', 'B8:27:EB:CC:33:03', 'ONLINE', NOW() - INTERVAL '1 minute', NOW() - INTERVAL '3 days', '3d 5h 42m', 8.2, 45.3, 55.8, 1024, 62.1, '16GB', '0.12 0.08 0.05', 'RUNNING', '2.3.8', 'cupu6zg5yura4gn6xgod95qn6', 'cnmapo7auxgbpzt08o3d88q07', NOW() - INTERVAL '120 days', NOW()),

  ('dev-004', 'rpi-rooftop-01', 'Rooftop Weather Station', 'rpi-rooftop-01', 'PI_4', 'Raspberry Pi 4 Model B 4GB', 'aarch64', 'Building Rooftop', 'Weather monitoring station with solar panel', '192.168.1.40', '100.64.0.40', 'DC:A6:32:DD:44:04', 'MAINTENANCE', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '60 days', '60d 2h 10m', 67.3, 71.2, 78.5, 4096, 89.3, '32GB', '2.15 1.85 1.42', 'RUNNING', '2.4.0', 'cm9g1p73t2b1jzwv4o49rmd1z', 'cnmapo7auxgbpzt08o3d88q07', NOW() - INTERVAL '180 days', NOW()),

  ('dev-005', 'rpi-parking-01', 'Parking Garage Sensor', 'rpi-parking-01', 'PI_ZERO', 'Raspberry Pi Zero 2 W', 'armv6l', 'Underground Parking - Level B2', 'Vehicle count and CO2 level monitoring', '192.168.1.50', NULL, 'B8:27:EB:EE:55:05', 'OFFLINE', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '30 days', '30d 0h 0m', 0, 35.0, 65.2, 512, 45.8, '16GB', '0.00 0.00 0.00', 'STOPPED', '2.3.5', 'cupu6zg5yura4gn6xgod95qn6', 'cnmapo7auxgbpzt08o3d88q07', NOW() - INTERVAL '150 days', NOW()),

  ('dev-006', 'opi-lab-01', 'R&D Lab Controller', 'orangepi-lab-01', 'ORANGE_PI', 'Orange Pi 5 Plus', 'aarch64', 'R&D Lab - Bench 4', 'Equipment monitoring and test automation controller', '192.168.1.60', '100.64.0.60', 'AA:BB:CC:DD:66:06', 'ONLINE', NOW() - INTERVAL '30 seconds', NOW() - INTERVAL '7 days', '7d 14h 22m', 45.1, 52.8, 48.3, 16384, 22.5, '256GB', '1.20 0.95 0.78', 'RUNNING', '2.4.1', 'cm9g1p73t2b1jzwv4o49rmd1z', 'cnmapo7auxgbpzt08o3d88q07', NOW() - INTERVAL '30 days', NOW()),

  ('dev-007', 'rpi-reception-01', 'Reception Display Kiosk', 'rpi-kiosk-01', 'PI_4', 'Raspberry Pi 4 Model B 4GB', 'aarch64', 'Main Lobby', 'Visitor check-in kiosk and welcome display', '192.168.1.70', NULL, 'DC:A6:32:FF:77:07', 'ONLINE', NOW() - INTERVAL '10 seconds', NOW() - INTERVAL '1 day', '1d 9h 5m', 32.4, 48.9, 61.2, 4096, 41.7, '32GB', '0.85 0.72 0.65', 'RUNNING', '2.4.1', 'cupu6zg5yura4gn6xgod95qn6', 'cnmapo7auxgbpzt08o3d88q07', NOW() - INTERVAL '45 days', NOW()),

  ('dev-008', 'rpi-prodline-01', 'Production Line Monitor', 'rpi-prodline-01', 'PI_5', 'Raspberry Pi 5 8GB', 'aarch64', 'Factory Floor - Line 1', 'Assembly line speed, defect detection and quality control', '192.168.1.80', '100.64.0.80', 'DC:A6:32:AA:88:08', 'ERROR', NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '2 days', '2d 1h 30m', 98.7, 82.4, 95.1, 8192, 91.2, '128GB', '4.50 3.80 3.20', 'ERROR', '2.4.1', 'cm9g1p73t2b1jzwv4o49rmd1z', 'cnmapo7auxgbpzt08o3d88q07', NOW() - INTERVAL '20 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Alerts (4 active, 2 resolved)
INSERT INTO alerts (id, "deviceId", "customerId", type, severity, title, message, source, resolved, "createdAt", "updatedAt") VALUES
  ('alert-001', 'dev-008', 'cnmapo7auxgbpzt08o3d88q07', 'HIGH_CPU', 'CRITICAL', 'CPU Usage Critical - Production Line Monitor', 'CPU usage has exceeded 95% for more than 15 minutes. Device may become unresponsive.', 'system-monitor', false, NOW() - INTERVAL '45 minutes', NOW()),
  ('alert-002', 'dev-004', 'cnmapo7auxgbpzt08o3d88q07', 'HIGH_TEMPERATURE', 'WARNING', 'High CPU Temperature - Rooftop Weather Station', 'CPU temperature reached 71.2C. Consider improving ventilation.', 'thermal-monitor', false, NOW() - INTERVAL '3 hours', NOW()),
  ('alert-003', 'dev-004', 'cnmapo7auxgbpzt08o3d88q07', 'LOW_DISK_SPACE', 'WARNING', 'Low Disk Space - Rooftop Weather Station', 'Disk usage at 89.3%. Log rotation recommended.', 'disk-monitor', false, NOW() - INTERVAL '1 day', NOW()),
  ('alert-004', 'dev-005', 'cnmapo7auxgbpzt08o3d88q07', 'DEVICE_OFFLINE', 'ERROR', 'Device Offline - Parking Garage Sensor', 'Device has been offline for 6 hours. Check power supply and network.', 'connectivity-monitor', false, NOW() - INTERVAL '6 hours', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO alerts (id, "deviceId", "customerId", type, severity, title, message, source, resolved, "resolvedAt", "createdAt", "updatedAt") VALUES
  ('alert-005', 'dev-002', 'cnmapo7auxgbpzt08o3d88q07', 'HIGH_MEMORY', 'WARNING', 'High Memory Usage - Warehouse Climate Controller', 'Memory usage peaked at 85%. Resolved after automatic GC.', 'memory-monitor', true, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '2 hours'),
  ('alert-006', 'dev-006', 'cnmapo7auxgbpzt08o3d88q07', 'SECURITY_ALERT', 'ERROR', 'Unauthorized SSH Attempt - R&D Lab Controller', 'Multiple failed SSH login attempts detected. IP blocked.', 'security-monitor', true, NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Thresholds (5 global + 1 device-specific)
INSERT INTO thresholds (id, "customerId", name, description, "metricName", operator, value, unit, severity, enabled, type, "cooldownMinutes", "createdAt", "updatedAt") VALUES
  ('thresh-001', 'cnmapo7auxgbpzt08o3d88q07', 'High CPU Usage', 'Alert when CPU exceeds 80%', 'cpuUsage', 'GREATER_THAN', 80, '%', 'WARNING', true, 'GLOBAL', 10, NOW(), NOW()),
  ('thresh-002', 'cnmapo7auxgbpzt08o3d88q07', 'Critical CPU Usage', 'Critical alert when CPU exceeds 95%', 'cpuUsage', 'GREATER_THAN', 95, '%', 'CRITICAL', true, 'GLOBAL', 5, NOW(), NOW()),
  ('thresh-003', 'cnmapo7auxgbpzt08o3d88q07', 'High CPU Temperature', 'Alert when CPU temp exceeds 70C', 'cpuTemp', 'GREATER_THAN', 70, 'C', 'WARNING', true, 'GLOBAL', 15, NOW(), NOW()),
  ('thresh-004', 'cnmapo7auxgbpzt08o3d88q07', 'Low Disk Space', 'Alert when disk usage exceeds 85%', 'diskUsage', 'GREATER_THAN', 85, '%', 'WARNING', true, 'GLOBAL', 30, NOW(), NOW()),
  ('thresh-005', 'cnmapo7auxgbpzt08o3d88q07', 'High Memory Usage', 'Alert when memory exceeds 80%', 'memoryUsage', 'GREATER_THAN', 80, '%', 'WARNING', true, 'GLOBAL', 10, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO thresholds (id, "deviceId", "customerId", name, description, "metricName", operator, value, unit, severity, enabled, type, "cooldownMinutes", "createdAt", "updatedAt") VALUES
  ('thresh-006', 'dev-008', 'cnmapo7auxgbpzt08o3d88q07', 'Production Line CPU', 'Strict CPU limit for production line', 'cpuUsage', 'GREATER_THAN', 75, '%', 'CRITICAL', true, 'DEVICE', 5, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Device Metrics (recent samples for charts)
INSERT INTO device_metrics (id, "deviceId", metric, value, unit, timestamp) VALUES
  ('m-001-1', 'dev-001', 'cpuUsage', 22.1, '%', NOW() - INTERVAL '6 hours'),
  ('m-001-2', 'dev-001', 'cpuUsage', 25.3, '%', NOW() - INTERVAL '5 hours'),
  ('m-001-3', 'dev-001', 'cpuUsage', 21.8, '%', NOW() - INTERVAL '4 hours'),
  ('m-001-4', 'dev-001', 'cpuUsage', 24.7, '%', NOW() - INTERVAL '3 hours'),
  ('m-001-5', 'dev-001', 'cpuUsage', 23.5, '%', NOW() - INTERVAL '2 hours'),
  ('m-001-6', 'dev-001', 'cpuUsage', 23.5, '%', NOW() - INTERVAL '1 hour'),
  ('m-008-1', 'dev-008', 'cpuUsage', 45.2, '%', NOW() - INTERVAL '6 hours'),
  ('m-008-2', 'dev-008', 'cpuUsage', 62.8, '%', NOW() - INTERVAL '5 hours'),
  ('m-008-3', 'dev-008', 'cpuUsage', 78.4, '%', NOW() - INTERVAL '4 hours'),
  ('m-008-4', 'dev-008', 'cpuUsage', 88.1, '%', NOW() - INTERVAL '3 hours'),
  ('m-008-5', 'dev-008', 'cpuUsage', 95.6, '%', NOW() - INTERVAL '2 hours'),
  ('m-008-6', 'dev-008', 'cpuUsage', 98.7, '%', NOW() - INTERVAL '1 hour'),
  ('m-002-1', 'dev-002', 'cpuUsage', 14.5, '%', NOW() - INTERVAL '6 hours'),
  ('m-002-2', 'dev-002', 'cpuUsage', 16.2, '%', NOW() - INTERVAL '3 hours'),
  ('m-002-3', 'dev-002', 'cpuUsage', 15.8, '%', NOW() - INTERVAL '1 hour')
ON CONFLICT (id) DO NOTHING;

-- API Key for demo customer
INSERT INTO api_keys (id, "userId", "customerId", name, key, "createdAt") VALUES
  ('apikey-demo-001', 'cm9g1p73t2b1jzwv4o49rmd1z', 'cnmapo7auxgbpzt08o3d88q07', 'Demo Hub API Key', 'iotp_hub_demo_k8s7f2m9p4q1w6x3n5v0j8r', NOW())
ON CONFLICT (id) DO NOTHING;
