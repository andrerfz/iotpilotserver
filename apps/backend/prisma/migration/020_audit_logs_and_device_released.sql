-- Migration 020: audit_logs table + DEVICE_RELEASED audit event
--
-- The AuditLog model exists in the Prisma schema and a functional AuditService
-- writes to it, but the table was never migrated to production and nothing was
-- wired to record events. This migration creates the enum + table (where
-- missing) so audit records can be persisted, starting with device Release
-- (leasing hand-back) — see ReleaseDeviceHandler.
--
-- Idempotent:
--   * enum: created with all values (incl. DEVICE_RELEASED) if absent; otherwise
--     the new value is added via ALTER TYPE ... ADD VALUE IF NOT EXISTS.
--   * table/indexes: CREATE ... IF NOT EXISTS.

DO $$ BEGIN
  CREATE TYPE "AuditEventType" AS ENUM (
    'USER_CREATED','USER_UPDATED','USER_DELETED','USER_ROLE_CHANGED','USER_STATUS_CHANGED',
    'DEVICE_CREATED','DEVICE_UPDATED','DEVICE_DELETED','DEVICE_RELEASED','DEVICE_CONNECTED',
    'DEVICE_DISCONNECTED','DEVICE_COMMAND_EXECUTED','DEVICE_COMMAND_FAILED','DEVICE_FILE_UPLOADED',
    'DEVICE_FILE_DOWNLOADED','CUSTOMER_CREATED','CUSTOMER_UPDATED','CUSTOMER_DELETED',
    'CUSTOMER_SUBSCRIPTION_CHANGED','THRESHOLD_CREATED','THRESHOLD_UPDATED','THRESHOLD_DELETED',
    'ALERT_ACKNOWLEDGED','ALERT_RESOLVED','BACKUP_CREATED','BACKUP_RESTORED','CONFIGURATION_BACKUP',
    'LOGS_EXPORTED','SECURITY_POLICY_CHANGED','ACCESS_CONTROL_CHANGED','AUDIT_LOG_ACCESSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- For environments where the enum already existed without the new value.
ALTER TYPE "AuditEventType" ADD VALUE IF NOT EXISTS 'DEVICE_RELEASED';

CREATE TABLE IF NOT EXISTS audit_logs (
  id             text NOT NULL,
  "eventType"    "AuditEventType" NOT NULL,
  "userId"       text NOT NULL,
  "customerId"   text,
  resource       text NOT NULL,
  action         text NOT NULL,
  "oldValues"    jsonb,
  "newValues"    jsonb,
  "ipAddress"    text,
  "userAgent"    text,
  success        boolean NOT NULL DEFAULT true,
  "errorMessage" text,
  "timestamp"    timestamp(3) without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "correlationId" text,
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT "audit_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "audit_logs_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES customers(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx"     ON audit_logs USING btree ("userId");
CREATE INDEX IF NOT EXISTS "audit_logs_customerId_idx" ON audit_logs USING btree ("customerId");
CREATE INDEX IF NOT EXISTS "audit_logs_eventType_idx"  ON audit_logs USING btree ("eventType");
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx     ON audit_logs USING btree (resource);
CREATE INDEX IF NOT EXISTS audit_logs_timestamp_idx    ON audit_logs USING btree ("timestamp");
CREATE INDEX IF NOT EXISTS audit_logs_success_idx      ON audit_logs USING btree (success);
