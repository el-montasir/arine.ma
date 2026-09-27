-- Responsive-image variant metadata.
--
-- Records, per image, the WebP variant widths (px) that were ACTUALLY generated
-- and written to storage. The storefront advertises a srcset candidate only for
-- a width present here, so a browser can never select a srcset candidate that
-- 404s. This replaces a client-side mechanism that downloaded every original
-- full-size image off-screen purely to measure its intrinsic width.
--
-- DEFAULT '{}' (empty array), not NULL: existing rows become valid-but-empty,
-- which the storefront treats identically to "no metadata" — it serves the
-- original with no srcset. The original always exists, so that is always safe.

-- AlterTable
ALTER TABLE "product_images" ADD COLUMN "variantWidths" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "package_images" ADD COLUMN "variantWidths" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "banners" ADD COLUMN "imageVariantWidths" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN "productImageVariantWidths" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "package_order_items" ADD COLUMN "packageImageVariantWidths" INTEGER[] DEFAULT ARRAY[]::INTEGER[];
