-- CreateEnum
CREATE TYPE "OrderProfitMode" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "OrderChargeType" AS ENUM ('SHIPPING_EXTRA', 'PACKAGING', 'OTHER');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'RETURNED';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "deliveredAt" TIMESTAMP(3),
ADD COLUMN     "deliveredAtEstimated" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "order_profits" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "mode" "OrderProfitMode" NOT NULL DEFAULT 'AUTO',
    "manualProfitCents" INTEGER,
    "goodsCostOverrideCents" INTEGER,
    "note" TEXT,
    "updatedByAdminId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_profits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_charges" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "type" "OrderChargeType" NOT NULL DEFAULT 'SHIPPING_EXTRA',
    "amountCents" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sadaqa_rates" (
    "id" SERIAL NOT NULL,
    "rateBp" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "createdByAdminId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sadaqa_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sadaqa_payments" (
    "id" SERIAL NOT NULL,
    "periodMonth" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "dueSnapshotCents" INTEGER NOT NULL,
    "ordersSnapshot" JSONB NOT NULL,
    "createdByAdminId" INTEGER,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "voidedByAdminId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sadaqa_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_profits_orderId_key" ON "order_profits"("orderId");

-- CreateIndex
CREATE INDEX "order_charges_orderId_idx" ON "order_charges"("orderId");

-- CreateIndex
CREATE INDEX "sadaqa_rates_effectiveFrom_idx" ON "sadaqa_rates"("effectiveFrom");

-- CreateIndex
CREATE INDEX "sadaqa_payments_periodMonth_idx" ON "sadaqa_payments"("periodMonth");

-- AddForeignKey
ALTER TABLE "order_profits" ADD CONSTRAINT "order_profits_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_profits" ADD CONSTRAINT "order_profits_updatedByAdminId_fkey" FOREIGN KEY ("updatedByAdminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_charges" ADD CONSTRAINT "order_charges_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sadaqa_rates" ADD CONSTRAINT "sadaqa_rates_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sadaqa_payments" ADD CONSTRAINT "sadaqa_payments_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sadaqa_payments" ADD CONSTRAINT "sadaqa_payments_voidedByAdminId_fkey" FOREIGN KEY ("voidedByAdminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill: legacy DELIVERED orders have no delivery date. Use updatedAt (the
-- last write, normally the status change to DELIVERED) and flag it as an
-- estimate so the admin can correct it. Raw SQL leaves updatedAt untouched.
UPDATE "orders"
SET "deliveredAt" = "updatedAt", "deliveredAtEstimated" = true
WHERE "status" = 'DELIVERED' AND "deliveredAt" IS NULL;

-- Default sadaqa rate: 7 % (700 basis points), in force since forever.
INSERT INTO "sadaqa_rates" ("rateBp", "effectiveFrom") VALUES (700, '1970-01-01 00:00:00');
