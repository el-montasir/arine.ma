-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchasePaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "PurchaseReturnStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateTable suppliers
CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "city" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable supplier_products
CREATE TABLE "supplier_products" (
    "id" SERIAL NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "purchasePrice" DECIMAL(10,2) NOT NULL,
    "minimumOrderQuantity" INTEGER,
    "supplierSku" TEXT,
    "notes" TEXT,
    "lastPurchasePrice" DECIMAL(10,2),
    "lastPurchasedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable purchases
CREATE TABLE "purchases" (
    "id" SERIAL NOT NULL,
    "purchaseNumber" TEXT NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'DRAFT',
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "shippingCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "otherCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdByAdminId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable purchase_items
CREATE TABLE "purchase_items" (
    "id" SERIAL NOT NULL,
    "purchaseId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantityOrdered" INTEGER NOT NULL,
    "quantityReceived" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) DEFAULT 0,
    "lineTotal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable purchase_payments
CREATE TABLE "purchase_payments" (
    "id" SERIAL NOT NULL,
    "purchaseId" INTEGER NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" "PurchasePaymentMethod" NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdByAdminId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable purchase_returns
CREATE TABLE "purchase_returns" (
    "id" SERIAL NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "purchaseId" INTEGER,
    "status" "PurchaseReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "returnDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refundAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reason" TEXT,
    "note" TEXT,
    "createdByAdminId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable purchase_return_items
CREATE TABLE "purchase_return_items" (
    "id" SERIAL NOT NULL,
    "purchaseReturnId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "reason" TEXT,
    "lineTotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "purchase_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suppliers_name_idx" ON "suppliers"("name");
CREATE INDEX "suppliers_isActive_idx" ON "suppliers"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_products_supplierId_productId_key" ON "supplier_products"("supplierId", "productId");
CREATE INDEX "supplier_products_supplierId_idx" ON "supplier_products"("supplierId");
CREATE INDEX "supplier_products_productId_idx" ON "supplier_products"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "purchases_purchaseNumber_key" ON "purchases"("purchaseNumber");
CREATE INDEX "purchases_supplierId_idx" ON "purchases"("supplierId");
CREATE INDEX "purchases_status_idx" ON "purchases"("status");
CREATE INDEX "purchases_purchaseDate_idx" ON "purchases"("purchaseDate");
CREATE INDEX "purchases_purchaseNumber_idx" ON "purchases"("purchaseNumber");

-- CreateIndex
CREATE INDEX "purchase_items_purchaseId_idx" ON "purchase_items"("purchaseId");
CREATE INDEX "purchase_items_productId_idx" ON "purchase_items"("productId");

-- CreateIndex
CREATE INDEX "purchase_payments_purchaseId_idx" ON "purchase_payments"("purchaseId");
CREATE INDEX "purchase_payments_supplierId_idx" ON "purchase_payments"("supplierId");
CREATE INDEX "purchase_payments_paymentDate_idx" ON "purchase_payments"("paymentDate");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_returns_returnNumber_key" ON "purchase_returns"("returnNumber");
CREATE INDEX "purchase_returns_supplierId_idx" ON "purchase_returns"("supplierId");
CREATE INDEX "purchase_returns_purchaseId_idx" ON "purchase_returns"("purchaseId");
CREATE INDEX "purchase_returns_status_idx" ON "purchase_returns"("status");
CREATE INDEX "purchase_returns_returnNumber_idx" ON "purchase_returns"("returnNumber");

-- CreateIndex
CREATE INDEX "purchase_return_items_purchaseReturnId_idx" ON "purchase_return_items"("purchaseReturnId");
CREATE INDEX "purchase_return_items_productId_idx" ON "purchase_return_items"("productId");

-- AddForeignKey
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_payments" ADD CONSTRAINT "purchase_payments_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_returns" ADD CONSTRAINT "purchase_returns_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_purchaseReturnId_fkey" FOREIGN KEY ("purchaseReturnId") REFERENCES "purchase_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_return_items" ADD CONSTRAINT "purchase_return_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
