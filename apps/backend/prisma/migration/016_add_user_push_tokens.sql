-- Migration: 016_add_user_push_tokens
-- Adds the user_push_tokens table for FCM/APNs device token storage (fe-mobile T8).
-- One token per user (upsert pattern enforced at application layer).

CREATE TYPE "PushPlatform" AS ENUM ('IOS', 'ANDROID');

CREATE TABLE "user_push_tokens" (
    "id"           TEXT          NOT NULL,
    "userId"       TEXT          NOT NULL,
    "customerId"   TEXT          NOT NULL,
    "platform"     "PushPlatform" NOT NULL,
    "token"        TEXT          NOT NULL,
    "deviceLabel"  TEXT,
    "lastSeenAt"   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt"    TIMESTAMP(3),

    CONSTRAINT "user_push_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_push_tokens_userId_token_key"
    ON "user_push_tokens"("userId", "token");

CREATE INDEX "user_push_tokens_userId_idx"
    ON "user_push_tokens"("userId");

ALTER TABLE "user_push_tokens"
    ADD CONSTRAINT "user_push_tokens_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_push_tokens"
    ADD CONSTRAINT "user_push_tokens_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
