-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_ORDER', 'STATUS_UPDATE', 'SYSTEM');

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "customers"("phone");
CREATE INDEX "customers_phone_idx" ON "customers"("phone");
CREATE INDEX "customers_status_idx" ON "customers"("status");

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "customerId" INTEGER;

-- CreateIndex
CREATE INDEX "orders_customerId_idx" ON "orders"("customerId");

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'NEW_ORDER',
    "title" TEXT,
    "message" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "orderId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_adminId_idx" ON "notifications"("adminId");
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");
CREATE INDEX "notifications_orderId_idx" ON "notifications"("orderId");
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data backfill for existing customers from orders
INSERT INTO "customers" ("fullName", "phone", "city", "address", "status", "createdAt", "updatedAt")
SELECT DISTINCT ON ("phone")
    "fullName",
    "phone",
    "city",
    "address",
    'ACTIVE'::"CustomerStatus",
    "createdAt",
    "updatedAt"
FROM "orders"
ORDER BY "phone", "createdAt" DESC
ON CONFLICT ("phone") DO NOTHING;

-- Link existing orders to the backfilled customers
UPDATE "orders" o
SET "customerId" = c."id"
FROM "customers" c
WHERE o."phone" = c."phone" AND o."customerId" IS NULL;
