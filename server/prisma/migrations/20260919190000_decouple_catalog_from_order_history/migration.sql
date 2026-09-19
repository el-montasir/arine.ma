-- AlterTable: make productId nullable in order_items and add productImage
ALTER TABLE "order_items" ALTER COLUMN "productId" DROP NOT NULL;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "productImage" TEXT;

-- AlterTable: make packageId nullable in package_order_items and add packageImage, itemsSnapshot
ALTER TABLE "package_order_items" ALTER COLUMN "packageId" DROP NOT NULL;
ALTER TABLE "package_order_items" ADD COLUMN IF NOT EXISTS "packageImage" TEXT;
ALTER TABLE "package_order_items" ADD COLUMN IF NOT EXISTS "itemsSnapshot" JSONB;

-- Drop existing foreign keys
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_productId_fkey";
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_orderId_fkey";
ALTER TABLE "package_order_items" DROP CONSTRAINT IF EXISTS "package_order_items_packageId_fkey";
ALTER TABLE "package_order_items" DROP CONSTRAINT IF EXISTS "package_order_items_orderId_fkey";
ALTER TABLE "package_items" DROP CONSTRAINT IF EXISTS "package_items_productId_fkey";

-- Add updated foreign keys with SetNull / Cascade
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "package_order_items" ADD CONSTRAINT "package_order_items_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "package_order_items" ADD CONSTRAINT "package_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "package_items" ADD CONSTRAINT "package_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill historical snapshots for existing order_items
UPDATE "order_items" oi
SET "productImage" = p.image
FROM "products" p
WHERE oi."productId" = p.id AND oi."productImage" IS NULL;

-- Backfill historical snapshots for existing package_order_items
UPDATE "package_order_items" poi
SET "packageImage" = pkg.image
FROM "packages" pkg
WHERE poi."packageId" = pkg.id AND poi."packageImage" IS NULL;

UPDATE "package_order_items" poi
SET "itemsSnapshot" = COALESCE((
  SELECT jsonb_agg(
    jsonb_build_object(
      'productId', pi."productId",
      'title', pr.title,
      'author', pr.author
    )
  )
  FROM "package_items" pi
  JOIN "products" pr ON pr.id = pi."productId"
  WHERE pi."packageId" = poi."packageId"
), '[]'::jsonb)
WHERE poi."packageId" IS NOT NULL AND poi."itemsSnapshot" IS NULL;
