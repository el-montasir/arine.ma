-- AlterTable: Add security fields to Admin table
-- Step 1: Update existing admins with null email to have a placeholder
UPDATE "admins" SET "email" = CONCAT('admin', "id", '@arine.local') WHERE "email" IS NULL;

-- Step 2: Add new security columns
ALTER TABLE "admins"
  ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lockoutUntil" TIMESTAMP(3);

-- Step 3: Make email NOT NULL
ALTER TABLE "admins"
  ALTER COLUMN "email" SET NOT NULL;
