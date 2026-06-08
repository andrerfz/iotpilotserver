-- =====================================================
-- 011: Add Notification Bounded Context
-- =====================================================
-- Creates: notification_records, notification_preferences, user_push_tokens
-- Enums: NotificationDeliveryStatus, NotificationChannelType, NotificationTypeEnum, PushPlatform

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE "NotificationDeliveryStatus" AS ENUM (
  'PENDING',
  'SENDING',
  'DELIVERED',
  'FAILED',
  'DEAD',
  'CANCELLED'
);

CREATE TYPE "NotificationChannelType" AS ENUM (
  'EMAIL',
  'SMS',
  'WEBHOOK',
  'SLACK',
  'TEAMS',
  'PUSH'
);

CREATE TYPE "NotificationTypeEnum" AS ENUM (
  'ALERT_TRIGGERED',
  'ALERT_RESOLVED',
  'DEVICE_OFFLINE',
  'DEVICE_ONLINE',
  'SYSTEM_MAINTENANCE',
  'USER_INVITATION',
  'CUSTOMER_CREATED'
);

CREATE TYPE "PushPlatform" AS ENUM (
  'IOS',
  'ANDROID'
);

-- =====================================================
-- notification_records
-- =====================================================

CREATE TABLE "notification_records" (
  "id"             TEXT NOT NULL,
  "customerId"     TEXT NOT NULL,
  "userId"         TEXT,
  "type"           "NotificationTypeEnum" NOT NULL,
  "channel"        "NotificationChannelType" NOT NULL,
  "recipient"      TEXT NOT NULL,
  "subject"        TEXT NOT NULL,
  "body"           TEXT NOT NULL,
  "status"         "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "attemptCount"   INTEGER NOT NULL DEFAULT 0,
  "maxAttempts"    INTEGER NOT NULL DEFAULT 3,
  "sourceEventId"  TEXT NOT NULL,
  "sourceEntityId" TEXT,
  "errorMessage"   TEXT,
  "scheduledAt"    TIMESTAMP(3),
  "sentAt"         TIMESTAMP(3),
  "deliveredAt"    TIMESTAMP(3),
  "failedAt"       TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt"      TIMESTAMP(3),

  CONSTRAINT "notification_records_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "notification_records"
  ADD CONSTRAINT "notification_records_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notification_records"
  ADD CONSTRAINT "notification_records_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "notification_records_customerId_status_idx"
  ON "notification_records"("customerId", "status");

CREATE INDEX "notification_records_customerId_userId_status_idx"
  ON "notification_records"("customerId", "userId", "status");

CREATE INDEX "notification_records_sourceEventId_idx"
  ON "notification_records"("sourceEventId");

CREATE INDEX "notification_records_createdAt_idx"
  ON "notification_records"("createdAt");

-- =====================================================
-- notification_preferences
-- =====================================================

CREATE TABLE "notification_preferences" (
  "id"               TEXT NOT NULL,
  "customerId"       TEXT NOT NULL,
  "userId"           TEXT NOT NULL,
  "channel"          "NotificationChannelType" NOT NULL,
  "notificationType" "NotificationTypeEnum" NOT NULL,
  "enabled"          BOOLEAN NOT NULL DEFAULT true,
  "destination"      TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt"        TIMESTAMP(3),

  CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "notification_preferences"
  ADD CONSTRAINT "notification_preferences_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notification_preferences"
  ADD CONSTRAINT "notification_preferences_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "notification_preferences_userId_channel_notificationType_key"
  ON "notification_preferences"("userId", "channel", "notificationType")
  WHERE "deletedAt" IS NULL;

CREATE INDEX "notification_preferences_userId_idx"
  ON "notification_preferences"("userId");

CREATE INDEX "notification_preferences_customerId_idx"
  ON "notification_preferences"("customerId");

-- =====================================================
-- user_push_tokens
-- =====================================================

CREATE TABLE "user_push_tokens" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "customerId"  TEXT NOT NULL,
  "platform"    "PushPlatform" NOT NULL,
  "token"       TEXT NOT NULL,
  "deviceLabel" TEXT,
  "lastSeenAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt"   TIMESTAMP(3),

  CONSTRAINT "user_push_tokens_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "user_push_tokens"
  ADD CONSTRAINT "user_push_tokens_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_push_tokens"
  ADD CONSTRAINT "user_push_tokens_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "user_push_tokens_userId_token_key"
  ON "user_push_tokens"("userId", "token")
  WHERE "deletedAt" IS NULL;

CREATE INDEX "user_push_tokens_userId_idx"
  ON "user_push_tokens"("userId");
