-- Migration 023: add description/contactEmail columns to customers
--
-- CustomerEntity (packages/core/src/customer/domain/entities/customer.entity.ts)
-- has supported `description` and `contactEmail` since it was written, and
-- UpdateCustomerCommand already accepts and applies them — but the customers
-- table never had matching columns, so PrismaCustomerRepository.save() silently
-- dropped both fields on every write. This adds the missing columns so the
-- Organization profile settings page can actually persist them.

ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
