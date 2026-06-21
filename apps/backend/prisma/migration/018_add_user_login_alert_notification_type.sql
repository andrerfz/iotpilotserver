-- Migration 018: add USER_LOGIN_ALERT to NotificationTypeEnum
-- The value was added to the Prisma schema but the original migration 011 did not include it.

ALTER TYPE "NotificationTypeEnum" ADD VALUE IF NOT EXISTS 'USER_LOGIN_ALERT';
