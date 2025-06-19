-- =====================================================
-- IoT Pilot Unified Initial Database Setup
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

-- User-related enums
CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'ADMIN', 'USER', 'READONLY');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED', 'INACTIVE');

-- Customer-related enums
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED', 'INACTIVE');

-- Device-related enums
CREATE TYPE "DeviceType" AS ENUM ('PI_ZERO', 'PI_3', 'PI_4', 'PI_5', 'ORANGE_PI', 'GENERIC', 'UNKNOWN');
CREATE TYPE "DeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'MAINTENANCE', 'ERROR');
CREATE TYPE "AppStatus" AS ENUM ('RUNNING', 'STOPPED', 'ERROR', 'NOT_INSTALLED', 'UNKNOWN');

-- System related enums
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL');
CREATE TYPE "CommandStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'TIMEOUT');
CREATE TYPE "AlertType" AS ENUM ('DEVICE_OFFLINE', 'DEVICE_REGISTERED', 'HIGH_CPU', 'HIGH_MEMORY', 'HIGH_TEMPERATURE', 'LOW_DISK_SPACE', 'APPLICATION_ERROR', 'SYSTEM_ERROR', 'SECURITY_ALERT', 'CUSTOM');
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');
CREATE TYPE "PreferenceCategory" AS ENUM ('PROFILE', 'NOTIFICATIONS', 'SECURITY', 'SYSTEM', 'APPEARANCE', 'ACCESSIBILITY');

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Customers table (multi-tenant support)
CREATE TABLE "customers" (
                             "id" TEXT NOT NULL,
                             "name" TEXT NOT NULL,
                             "slug" TEXT NOT NULL,
                             "domain" TEXT,
                             "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
                             "subscriptionTier" TEXT NOT NULL DEFAULT 'FREE',
                             "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                             "updatedAt" TIMESTAMP(3) NOT NULL,
                             "deletedAt" TIMESTAMP(3),

                             CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- Users table
CREATE TABLE "users" (
                         "id" TEXT NOT NULL,
                         "email" TEXT NOT NULL,
                         "username" TEXT NOT NULL,
                         "password" TEXT NOT NULL,
                         "role" "UserRole" NOT NULL DEFAULT 'USER',
                         "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
                         "profileImage" TEXT,
                         "customerId" TEXT, -- Nullable for SUPERADMIN only
                         "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                         "updatedAt" TIMESTAMP(3) NOT NULL,
                         "deletedAt" TIMESTAMP(3),

                         CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Sessions table
CREATE TABLE "sessions" (
                            "id" TEXT NOT NULL,
                            "userId" TEXT NOT NULL,
                            "token" TEXT NOT NULL,
                            "expiresAt" TIMESTAMP(3) NOT NULL,
                            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            "deletedAt" TIMESTAMP(3),

                            CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- API Keys table (with customer context)
CREATE TABLE "api_keys" (
                            "id" TEXT NOT NULL,
                            "userId" TEXT NOT NULL,
                            "customerId" TEXT,
                            "name" TEXT NOT NULL,
                            "key" TEXT NOT NULL,
                            "lastUsed" TIMESTAMP(3),
                            "expiresAt" TIMESTAMP(3),
                            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                            "deletedAt" TIMESTAMP(3),

                            CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- =====================================================
-- DEVICE TABLES
-- =====================================================

-- Devices table
CREATE TABLE "devices" (
                           "id" TEXT NOT NULL,
                           "deviceId" TEXT NOT NULL,
                           "hostname" TEXT NOT NULL,
                           "deviceType" "DeviceType" NOT NULL,
                           "deviceModel" TEXT,
                           "architecture" TEXT NOT NULL,
                           "location" TEXT,
                           "description" TEXT,
                           "ipAddress" TEXT,
                           "tailscaleIp" TEXT,
                           "macAddress" TEXT,
                           "status" "DeviceStatus" NOT NULL DEFAULT 'OFFLINE',
                           "lastSeen" TIMESTAMP(3),
                           "lastBoot" TIMESTAMP(3),
                           "uptime" TEXT,
                           "cpuUsage" DOUBLE PRECISION,
                           "cpuTemp" DOUBLE PRECISION,
                           "memoryUsage" DOUBLE PRECISION,
                           "memoryTotal" INTEGER,
                           "diskUsage" DOUBLE PRECISION,
                           "diskTotal" TEXT,
                           "loadAverage" TEXT,
                           "appStatus" "AppStatus" NOT NULL DEFAULT 'UNKNOWN',
                           "agentVersion" TEXT,
                           "userId" TEXT,
                           "customerId" TEXT NOT NULL,
                           "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           "updatedAt" TIMESTAMP(3) NOT NULL,
                           "deletedAt" TIMESTAMP(3),

                           CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- Device metrics table
CREATE TABLE "device_metrics" (
                                  "id" TEXT NOT NULL,
                                  "deviceId" TEXT NOT NULL,
                                  "metric" TEXT NOT NULL,
                                  "value" DOUBLE PRECISION NOT NULL,
                                  "unit" TEXT,
                                  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                  "deletedAt" TIMESTAMP(3),

                                  CONSTRAINT "device_metrics_pkey" PRIMARY KEY ("id")
);

-- Device logs table
CREATE TABLE "device_logs" (
                               "id" TEXT NOT NULL,
                               "deviceId" TEXT NOT NULL,
                               "level" "LogLevel" NOT NULL DEFAULT 'INFO',
                               "message" TEXT NOT NULL,
                               "source" TEXT,
                               "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                               "deletedAt" TIMESTAMP(3),

                               CONSTRAINT "device_logs_pkey" PRIMARY KEY ("id")
);

-- Device commands table
CREATE TABLE "device_commands" (
                                   "id" TEXT NOT NULL,
                                   "deviceId" TEXT NOT NULL,
                                   "command" TEXT NOT NULL,
                                   "arguments" TEXT,
                                   "status" "CommandStatus" NOT NULL DEFAULT 'PENDING',
                                   "output" TEXT,
                                   "error" TEXT,
                                   "exitCode" INTEGER,
                                   "executedAt" TIMESTAMP(3),
                                   "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                   "updatedAt" TIMESTAMP(3) NOT NULL,
                                   "deletedAt" TIMESTAMP(3),

                                   CONSTRAINT "device_commands_pkey" PRIMARY KEY ("id")
);

-- =====================================================
-- ALERTING TABLES
-- =====================================================

-- Alerts table (with multi-tenant support)
CREATE TABLE "alerts" (
                          "id" TEXT NOT NULL,
                          "deviceId" TEXT,
                          "userId" TEXT,
                          "customerId" TEXT NOT NULL, -- Required for multi-tenant
                          "type" "AlertType" NOT NULL,
                          "severity" "AlertSeverity" NOT NULL DEFAULT 'INFO',
                          "title" TEXT NOT NULL,
                          "message" TEXT NOT NULL,
                          "source" TEXT,
                          "resolved" BOOLEAN NOT NULL DEFAULT false,
                          "resolvedAt" TIMESTAMP(3),
                          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          "updatedAt" TIMESTAMP(3) NOT NULL,
                          "deletedAt" TIMESTAMP(3),

                          CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- =====================================================
-- PREFERENCES AND SYSTEM TABLES
-- =====================================================

-- User preferences table
CREATE TABLE "user_preferences" (
                                    "id" TEXT NOT NULL,
                                    "userId" TEXT NOT NULL,
                                    "category" "PreferenceCategory" NOT NULL,
                                    "key" TEXT NOT NULL,
                                    "value" TEXT NOT NULL,
                                    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                    "updatedAt" TIMESTAMP(3) NOT NULL,
                                    "deletedAt" TIMESTAMP(3),

                                    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- System configuration table
CREATE TABLE "system_config" (
                                 "id" TEXT NOT NULL,
                                 "key" TEXT NOT NULL,
                                 "value" TEXT NOT NULL,
                                 "category" TEXT,
                                 "updatedAt" TIMESTAMP(3) NOT NULL,
                                 "deletedAt" TIMESTAMP(3),

                                 CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Customers indexes
CREATE UNIQUE INDEX "customers_slug_key" ON "customers" ("slug") WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "customers_domain_key" ON "customers" ("domain") WHERE "deletedAt" IS NULL;

-- Users indexes
CREATE UNIQUE INDEX "users_email_key" ON "users" ("email") WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "users_username_key" ON "users" ("username") WHERE "deletedAt" IS NULL;
CREATE INDEX "users_customerId_idx" ON "users" ("customerId") WHERE "deletedAt" IS NULL;

-- Sessions indexes
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions" ("token") WHERE "deletedAt" IS NULL;

-- API Keys indexes
CREATE UNIQUE INDEX "api_keys_key_key" ON "api_keys" ("key") WHERE "deletedAt" IS NULL;
CREATE INDEX "api_keys_customerId_idx" ON "api_keys" ("customerId") WHERE "deletedAt" IS NULL;

-- Devices indexes
CREATE UNIQUE INDEX "devices_deviceId_key" ON "devices" ("deviceId") WHERE "deletedAt" IS NULL;
CREATE INDEX "devices_customerId_idx" ON "devices" ("customerId") WHERE "deletedAt" IS NULL;
CREATE INDEX "devices_status_customerId_idx" ON "devices" ("status", "customerId") WHERE "deletedAt" IS NULL;

-- Device metrics indexes
CREATE INDEX "device_metrics_deviceId_metric_timestamp_idx" ON "device_metrics" ("deviceId", "metric", "timestamp") WHERE "deletedAt" IS NULL;

-- Device logs indexes
CREATE INDEX "device_logs_deviceId_level_timestamp_idx" ON "device_logs" ("deviceId", "level", "timestamp") WHERE "deletedAt" IS NULL;

-- Alerts indexes
CREATE INDEX "alerts_deviceId_resolved_createdAt_idx" ON "alerts" ("deviceId", "resolved", "createdAt") WHERE "deletedAt" IS NULL;
CREATE INDEX "alerts_customerId_idx" ON "alerts" ("customerId") WHERE "deletedAt" IS NULL;
CREATE INDEX "alerts_customerId_resolved_idx" ON "alerts" ("customerId", "resolved") WHERE "deletedAt" IS NULL;

-- User preferences indexes
CREATE UNIQUE INDEX "user_preferences_userId_category_key_key" ON "user_preferences" ("userId", "category", "key") WHERE "deletedAt" IS NULL;
CREATE INDEX "user_preferences_userId_category_idx" ON "user_preferences" ("userId", "category") WHERE "deletedAt" IS NULL;

-- System config indexes
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config" ("key") WHERE "deletedAt" IS NULL;

-- =====================================================
-- CONSTRAINTS
-- =====================================================

-- Ensure only SUPERADMIN users can have NULL customerId
ALTER TABLE "users" ADD CONSTRAINT "superadmin_customer_constraint"
    CHECK (("role" = 'SUPERADMIN') OR ("customerId" IS NOT NULL));

-- =====================================================
-- FOREIGN KEYS (NO CASCADE DELETES)
-- =====================================================

-- User relationships
ALTER TABLE "users" ADD CONSTRAINT "users_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Session relationships
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- API Key relationships
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Device relationships
ALTER TABLE "devices" ADD CONSTRAINT "devices_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "devices" ADD CONSTRAINT "devices_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Device metrics relationships
ALTER TABLE "device_metrics" ADD CONSTRAINT "device_metrics_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "devices" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Device logs relationships
ALTER TABLE "device_logs" ADD CONSTRAINT "device_logs_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "devices" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Device commands relationships
ALTER TABLE "device_commands" ADD CONSTRAINT "device_commands_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "devices" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Alert relationships
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "devices" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "alerts" ADD CONSTRAINT "alerts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "alerts" ADD CONSTRAINT "alerts_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- User preferences relationships
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Create default customer
INSERT INTO "customers" ("id", "name", "slug", "status", "createdAt", "updatedAt")
VALUES (
           'default-customer',
           'Default Customer',
           'default',
           'ACTIVE',
           CURRENT_TIMESTAMP,
           CURRENT_TIMESTAMP
       );

-- Insert the default SUPERADMIN user (no customerId - platform admin)
INSERT INTO "users" ("id", "email", "username", "password", "role", "status", "createdAt", "updatedAt")
VALUES (
           'default-admin-user',
           'manager@iotpilot.app',
           'manager',
           '$2a$12$6AqdbjYxNrBnTRJ6wlTIgO/.h4FpO5YCOPtVEHEiMvaOgR.JHiWJq',
           'SUPERADMIN',
           'ACTIVE',
           CURRENT_TIMESTAMP,
           CURRENT_TIMESTAMP
       );

-- Insert default system configuration
INSERT INTO "system_config" ("id", "key", "value", "category", "updatedAt")
VALUES
    ('config-1', 'app_name', 'IoT Pilot', 'general', CURRENT_TIMESTAMP),
    ('config-2', 'app_version', '1.0.0', 'general', CURRENT_TIMESTAMP),
    ('config-3', 'maintenance_mode', 'false', 'system', CURRENT_TIMESTAMP),
    ('config-4', 'max_devices', '100', 'limits', CURRENT_TIMESTAMP),
    ('config-5', 'device_offline_threshold_minutes', '5', 'monitoring', CURRENT_TIMESTAMP),
    ('config-6', 'alert_cpu_threshold', '85', 'monitoring', CURRENT_TIMESTAMP),
    ('config-7', 'alert_memory_threshold', '85', 'monitoring', CURRENT_TIMESTAMP),
    ('config-8', 'alert_temperature_threshold', '70', 'monitoring', CURRENT_TIMESTAMP),
    ('config-9', 'alert_disk_threshold', '85', 'monitoring', CURRENT_TIMESTAMP),
    ('config-10', 'backup_retention_days', '30', 'backup', CURRENT_TIMESTAMP),
    ('config-11', 'enable_soft_deletes', 'true', 'system', CURRENT_TIMESTAMP),
    ('config-12', 'soft_delete_retention_days', '90', 'system', CURRENT_TIMESTAMP);

-- Insert default preferences for SUPERADMIN user
INSERT INTO "user_preferences" ("id", "userId", "category", "key", "value", "createdAt", "updatedAt")
VALUES
    ('pref-1', 'default-admin-user', 'NOTIFICATIONS', 'emailNotifications', 'true', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('pref-2', 'default-admin-user', 'NOTIFICATIONS', 'alertNotifications', 'true', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('pref-3', 'default-admin-user', 'SECURITY', 'twoFactorEnabled', 'false', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('pref-4', 'default-admin-user', 'APPEARANCE', 'theme', 'dark', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- =====================================================
-- VIEWS (Optional - for easier querying)
-- =====================================================

-- Active users view (excluding soft deleted)
CREATE VIEW "active_users" AS
SELECT * FROM "users" WHERE "deletedAt" IS NULL;

-- Active devices view (excluding soft deleted)
CREATE VIEW "active_devices" AS
SELECT * FROM "devices" WHERE "deletedAt" IS NULL;

-- Active customers view (excluding soft deleted)
CREATE VIEW "active_customers" AS
SELECT * FROM "customers" WHERE "deletedAt" IS NULL;

-- Active API keys view (excluding soft deleted)
CREATE VIEW "active_api_keys" AS
SELECT * FROM "api_keys" WHERE "deletedAt" IS NULL;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE "customers" IS 'Multi-tenant customers/organizations';
COMMENT ON TABLE "users" IS 'Platform users with role-based access';
COMMENT ON TABLE "devices" IS 'IoT devices registered to customers';
COMMENT ON TABLE "api_keys" IS 'API keys for device authentication';
COMMENT ON TABLE "alerts" IS 'System alerts and notifications';

COMMENT ON COLUMN "users"."customerId" IS 'NULL for SUPERADMIN, required for all other roles';
COMMENT ON COLUMN "api_keys"."customerId" IS 'Inherited from user for easier validation';
COMMENT ON COLUMN "devices"."customerId" IS 'Required - all devices belong to a customer';
COMMENT ON COLUMN "alerts"."customerId" IS 'Required - all alerts belong to a customer';

-- Add deletedAt comments
COMMENT ON COLUMN "users"."deletedAt" IS 'Soft delete timestamp';
COMMENT ON COLUMN "devices"."deletedAt" IS 'Soft delete timestamp';
COMMENT ON COLUMN "customers"."deletedAt" IS 'Soft delete timestamp';
COMMENT ON COLUMN "api_keys"."deletedAt" IS 'Soft delete timestamp';
COMMENT ON COLUMN "alerts"."deletedAt" IS 'Soft delete timestamp';
