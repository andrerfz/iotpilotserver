-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'PENDING', 'SUSPENDED', 'INACTIVE');

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "subscriptionTier" TEXT NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

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

-- Add customerId to users table
ALTER TABLE "users" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "users" ADD COLUMN "customerId" TEXT;

-- Add customerId to devices table
ALTER TABLE "devices" ADD COLUMN "customerId" TEXT;

-- Update existing users (except SUPERADMIN) to be associated with default customer
UPDATE "users" SET "customerId" = 'default-customer' WHERE "role" != 'SUPERADMIN';

-- Update all existing devices to be associated with default customer
UPDATE "devices" SET "customerId" = 'default-customer';

-- Make customerId NOT NULL for devices
ALTER TABLE "devices" ALTER COLUMN "customerId" SET NOT NULL;

-- Add constraint to ensure only SUPERADMIN users can have NULL customerId
ALTER TABLE "users" ADD CONSTRAINT "superadmin_customer_constraint" 
    CHECK (("role" = 'SUPERADMIN') OR ("customerId" IS NOT NULL));

-- Create indexes
CREATE UNIQUE INDEX "customers_slug_key" ON "customers" ("slug");
CREATE UNIQUE INDEX "customers_domain_key" ON "customers" ("domain");
CREATE INDEX "users_customerId_idx" ON "users" ("customerId");
CREATE INDEX "devices_customerId_idx" ON "devices" ("customerId");

-- Add foreign key constraints
ALTER TABLE "users" ADD CONSTRAINT "users_customerId_fkey" 
    FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "devices" ADD CONSTRAINT "devices_customerId_fkey" 
    FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Update bootstrap SUPERADMIN user
UPDATE "users" SET "email" = 'admin@iotpilot.system' WHERE "role" = 'SUPERADMIN' AND "email" = 'manager@iotpilot.app';