-- Add stock management fields to products table
ALTER TABLE "products"
  ADD COLUMN "trackStock"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "currentStock"      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lowStockThreshold" INTEGER NOT NULL DEFAULT 5;

-- All existing products default to trackStock=false so they remain purchasable
-- without any stock enforcement (additive migration, zero blast radius)

-- Add quantity to package_items (default 1 preserves all existing package behavior)
ALTER TABLE "package_items"
  ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;

-- Add inventory lifecycle fields to orders
ALTER TABLE "orders"
  ADD COLUMN "stockDeducted"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stockDeductionCycleId" TEXT;

-- Create stock movement reason enum
CREATE TYPE "StockMovementReason" AS ENUM (
  'ORDER_CONFIRMED',
  'ORDER_CANCELLED',
  'MANUAL_ADJUSTMENT',
  'RESTOCK'
);

-- Create stock_movements ledger table (append-only)
CREATE TABLE "stock_movements" (
  "id"            SERIAL PRIMARY KEY,
  "productId"     INTEGER       NOT NULL,
  "orderId"       INTEGER,
  "cycleId"       TEXT,
  "reason"        "StockMovementReason" NOT NULL,
  "delta"         INTEGER       NOT NULL,
  "previousStock" INTEGER       NOT NULL,
  "newStock"      INTEGER       NOT NULL,
  "actorAdminId"  INTEGER,
  "note"          TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE,
  CONSTRAINT "stock_movements_orderId_fkey"   FOREIGN KEY ("orderId")   REFERENCES "orders"("id")   ON DELETE SET NULL,
  CONSTRAINT "stock_movements_actorAdminId_fkey" FOREIGN KEY ("actorAdminId") REFERENCES "admins"("id") ON DELETE SET NULL
);

-- Unique constraint for idempotent order-linked movements
CREATE UNIQUE INDEX "stock_movements_cycleId_productId_reason_key"
  ON "stock_movements"("cycleId", "productId", "reason")
  WHERE "cycleId" IS NOT NULL;

-- Indexes for common query patterns
CREATE INDEX "stock_movements_productId_idx"  ON "stock_movements"("productId");
CREATE INDEX "stock_movements_orderId_idx"    ON "stock_movements"("orderId");
CREATE INDEX "stock_movements_createdAt_idx"  ON "stock_movements"("createdAt");

-- Stock settings (singleton row, id=1)
CREATE TABLE "stock_settings" (
  "id"                           INTEGER PRIMARY KEY DEFAULT 1,
  "stockManagementEnabled"       BOOLEAN NOT NULL DEFAULT false,
  "allowOverselling"             BOOLEAN NOT NULL DEFAULT false,
  "lowStockAlertEnabled"         BOOLEAN NOT NULL DEFAULT true,
  "defaultLowStockThreshold"     INTEGER NOT NULL DEFAULT 5,
  "updatedAt"                    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert the default singleton settings row
INSERT INTO "stock_settings" ("id") VALUES (1);
