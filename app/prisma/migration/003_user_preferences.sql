-- CreateEnum
CREATE TYPE "PreferenceCategory" AS ENUM ('PROFILE', 'NOTIFICATIONS', 'SECURITY', 'SYSTEM', 'APPEARANCE', 'ACCESSIBILITY');

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "PreferenceCategory" NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE UNIQUE INDEX "user_preferences_userId_category_key_key" ON "user_preferences" ("userId", "category", "key");
CREATE INDEX "user_preferences_userId_category_idx" ON "user_preferences" ("userId", "category");

-- Add foreign key constraints
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Insert default preferences for existing users
INSERT INTO "user_preferences" ("id", "userId", "category", "key", "value", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid(), 
    id, 
    'NOTIFICATIONS'::PreferenceCategory, 
    'emailNotifications', 
    'true', 
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP
FROM "users";