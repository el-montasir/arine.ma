-- AlterTable
ALTER TABLE "admins" ADD COLUMN "email" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "lastLoginAt" TIMESTAMP(3),
ADD COLUMN "notes" TEXT,
ADD COLUMN "createdBy" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- Backfill email if username is an email
UPDATE "admins" SET "email" = LOWER("username") WHERE "username" LIKE '%@%';

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" SERIAL NOT NULL,
    "actorId" INTEGER,
    "actorName" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_logs_actorId_idx" ON "activity_logs"("actorId");

-- CreateIndex
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action");

-- CreateIndex
CREATE INDEX "activity_logs_resourceType_idx" ON "activity_logs"("resourceType");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
