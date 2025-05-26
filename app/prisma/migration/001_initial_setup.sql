-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER', 'READONLY');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('PI_ZERO', 'PI_3', 'PI_4', 'PI_5', 'ORANGE_PI', 'GENERIC', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ONLINE', 'OFFLINE', 'MAINTENANCE', 'ERROR');

-- CreateEnum
CREATE TYPE "AppStatus" AS ENUM ('RUNNING', 'STOPPED', 'ERROR', 'NOT_INSTALLED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL');

-- CreateEnum
CREATE TYPE "CommandStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('DEVICE_OFFLINE', 'HIGH_CPU', 'HIGH_MEMORY', 'HIGH_TEMPERATURE', 'LOW_DISK_SPACE', 'APPLICATION_ERROR', 'SYSTEM_ERROR', 'SECURITY_ALERT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateTable
CREATE TABLE "users" (
                         "id" TEXT NOT NULL,
                         "email" TEXT NOT NULL,
                         "username" TEXT NOT NULL,
                         "password" TEXT NOT NULL,
                         "role" "UserRole" NOT NULL DEFAULT 'USER',
                         "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                         "updatedAt" TIMESTAMP(3) NOT NULL,

                         CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
                            "id" TEXT NOT NULL,
                            "userId" TEXT NOT NULL,
                            "token" TEXT NOT NULL,
                            "expiresAt" TIMESTAMP(3) NOT NULL,
                            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

                            CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
                            "id" TEXT NOT NULL,
                            "userId" TEXT NOT NULL,
                            "name" TEXT NOT NULL,
                            "key" TEXT NOT NULL,
                            "lastUsed" TIMESTAMP(3),
                            "expiresAt" TIMESTAMP(3),
                            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

                            CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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
                           "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           "updatedAt" TIMESTAMP(3) NOT NULL,

                           CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_metrics" (
                                  "id" TEXT NOT NULL,
                                  "deviceId" TEXT NOT NULL,
                                  "metric" TEXT NOT NULL,
                                  "value" DOUBLE PRECISION NOT NULL,
                                  "unit" TEXT,
                                  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                  CONSTRAINT "device_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_logs" (
                               "id" TEXT NOT NULL,
                               "deviceId" TEXT NOT NULL,
                               "level" "LogLevel" NOT NULL DEFAULT 'INFO',
                               "message" TEXT NOT NULL,
                               "source" TEXT,
                               "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

                               CONSTRAINT "device_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

                                   CONSTRAINT "device_commands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
                          "id" TEXT NOT NULL,
                          "deviceId" TEXT,
                          "userId" TEXT,
                          "type" "AlertType" NOT NULL,
                          "severity" "AlertSeverity" NOT NULL DEFAULT 'INFO',
                          "title" TEXT NOT NULL,
                          "message" TEXT NOT NULL,
                          "resolved" BOOLEAN NOT NULL DEFAULT false,
                          "resolvedAt" TIMESTAMP(3),
                          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          "updatedAt" TIMESTAMP(3) NOT NULL,

                          CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
                                 "id" TEXT NOT NULL,
                                 "key" TEXT NOT NULL,
                                 "value" TEXT NOT NULL,
                                 "category" TEXT,
                                 "updatedAt" TIMESTAMP(3) NOT NULL,

                                 CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_key" ON "api_keys"("key");

-- CreateIndex
CREATE UNIQUE INDEX "devices_deviceId_key" ON "devices"("deviceId");

-- CreateIndex
CREATE INDEX "device_metrics_deviceId_metric_timestamp_idx" ON "device_metrics"("deviceId", "metric", "timestamp");

-- CreateIndex
CREATE INDEX "device_logs_deviceId_level_timestamp_idx" ON "device_logs"("deviceId", "level", "timestamp");

-- CreateIndex
CREATE INDEX "alerts_deviceId_resolved_createdAt_idx" ON "alerts"("deviceId", "resolved", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_metrics" ADD CONSTRAINT "device_metrics_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_logs" ADD CONSTRAINT "device_logs_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_commands" ADD CONSTRAINT "device_commands_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Insert default admin user (password: admin123)
INSERT INTO "users" ("id", "email", "username", "password", "role", "createdAt", "updatedAt")
VALUES (
           'default-admin-user',
           'admin@iotpilot.local',
           'admin',
           '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPZTkQP5vDz.K', -- bcrypt hash for 'admin123'
           'ADMIN',
           CURRENT_TIMESTAMP,
           CURRENT_TIMESTAMP
       );

-- Insert default system configuration
INSERT INTO "system_config" ("id", "key", "value", "category", "updatedAt") VALUES
                                                                                ('config-1', 'app_name', 'IoT Pilot', 'general', CURRENT_TIMESTAMP),
                                                                                ('config-2', 'app_version', '1.0.0', 'general', CURRENT_TIMESTAMP),
                                                                                ('config-3', 'maintenance_mode', 'false', 'system', CURRENT_TIMESTAMP),
                                                                                ('config-4', 'max_devices', '100', 'limits', CURRENT_TIMESTAMP),
                                                                                ('config-5', 'device_offline_threshold_minutes', '5', 'monitoring', CURRENT_TIMESTAMP),
                                                                                ('config-6', 'alert_cpu_threshold', '85', 'monitoring', CURRENT_TIMESTAMP),
                                                                                ('config-7', 'alert_memory_threshold', '85', 'monitoring', CURRENT_TIMESTAMP),
                                                                                ('config-8', 'alert_temperature_threshold', '70', 'monitoring', CURRENT_TIMESTAMP),
                                                                                ('config-9', 'alert_disk_threshold', '85', 'monitoring', CURRENT_TIMESTAMP),
                                                                                ('config-10', 'backup_retention_days', '30', 'backup', CURRENT_TIMESTAMP);