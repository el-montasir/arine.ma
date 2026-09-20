-- CreateEnum
CREATE TYPE "MarketingEventStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'DUPLICATE', 'SKIPPED');

-- CreateEnum
CREATE TYPE "CatalogSyncStatus" AS ENUM ('SYNCED', 'PENDING', 'FAILED', 'OUT_OF_SYNC');

-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'PARTIAL_SUCCESS');

-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "color" DROP NOT NULL;

-- CreateTable
CREATE TABLE "marketing_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "marketing_connections" (
    "id" SERIAL NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'meta',
    "status" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
    "accountName" TEXT,
    "accountId" TEXT,
    "pixelId" TEXT,
    "catalogId" TEXT,
    "tokenScope" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_events" (
    "id" SERIAL NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'SERVER',
    "actionSource" TEXT NOT NULL DEFAULT 'website',
    "eventSourceUrl" TEXT,
    "status" "MarketingEventStatus" NOT NULL DEFAULT 'PENDING',
    "orderId" INTEGER,
    "productId" INTEGER,
    "packageId" INTEGER,
    "value" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'MAD',
    "userData" JSONB,
    "customData" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "fbtraceId" TEXT,
    "responseBody" JSONB,
    "errorMessage" TEXT,
    "attributionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_attributions" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "fbclid" TEXT,
    "fbp" TEXT,
    "fbc" TEXT,
    "metaCampaignId" TEXT,
    "metaCampaignName" TEXT,
    "metaAdSetId" TEXT,
    "metaAdSetName" TEXT,
    "metaAdId" TEXT,
    "metaAdName" TEXT,
    "firstTouchSource" TEXT,
    "firstTouchMedium" TEXT,
    "firstTouchCampaign" TEXT,
    "firstTouchTimestamp" TIMESTAMP(3),
    "lastTouchSource" TEXT,
    "lastTouchMedium" TEXT,
    "lastTouchCampaign" TEXT,
    "lastTouchTimestamp" TIMESTAMP(3),
    "landingPage" TEXT,
    "referrer" TEXT,
    "deviceType" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_attributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_catalog_items" (
    "id" SERIAL NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemType" TEXT NOT NULL,
    "productId" INTEGER,
    "packageId" INTEGER,
    "externalMetaId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MAD',
    "availability" TEXT NOT NULL DEFAULT 'in stock',
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "category" TEXT,
    "syncStatus" "CatalogSyncStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "syncDetails" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_sync_jobs" (
    "id" SERIAL NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'PENDING',
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "syncedItems" INTEGER NOT NULL DEFAULT 0,
    "failedItems" INTEGER NOT NULL DEFAULT 0,
    "details" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "marketing_sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_campaigns_cache" (
    "id" SERIAL NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT,
    "status" TEXT NOT NULL,
    "effectiveStatus" TEXT,
    "dailyBudget" DOUBLE PRECISION,
    "lifetimeBudget" DOUBLE PRECISION,
    "budgetRemaining" DOUBLE PRECISION,
    "startTime" TIMESTAMP(3),
    "stopTime" TIMESTAMP(3),
    "spend" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "cpc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cpm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "metaRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "attributedOrders" INTEGER NOT NULL DEFAULT 0,
    "attributedRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cpa" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_campaigns_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marketing_connections_platform_key" ON "marketing_connections"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "marketing_events_eventId_key" ON "marketing_events"("eventId");

-- CreateIndex
CREATE INDEX "marketing_events_eventName_idx" ON "marketing_events"("eventName");

-- CreateIndex
CREATE INDEX "marketing_events_status_idx" ON "marketing_events"("status");

-- CreateIndex
CREATE INDEX "marketing_events_eventTime_idx" ON "marketing_events"("eventTime");

-- CreateIndex
CREATE INDEX "marketing_events_orderId_idx" ON "marketing_events"("orderId");

-- CreateIndex
CREATE INDEX "marketing_events_attributionId_idx" ON "marketing_events"("attributionId");

-- CreateIndex
CREATE UNIQUE INDEX "marketing_attributions_orderId_key" ON "marketing_attributions"("orderId");

-- CreateIndex
CREATE INDEX "marketing_attributions_utmSource_idx" ON "marketing_attributions"("utmSource");

-- CreateIndex
CREATE INDEX "marketing_attributions_utmMedium_idx" ON "marketing_attributions"("utmMedium");

-- CreateIndex
CREATE INDEX "marketing_attributions_utmCampaign_idx" ON "marketing_attributions"("utmCampaign");

-- CreateIndex
CREATE INDEX "marketing_attributions_metaCampaignId_idx" ON "marketing_attributions"("metaCampaignId");

-- CreateIndex
CREATE INDEX "marketing_attributions_fbclid_idx" ON "marketing_attributions"("fbclid");

-- CreateIndex
CREATE INDEX "marketing_attributions_createdAt_idx" ON "marketing_attributions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "marketing_catalog_items_itemId_key" ON "marketing_catalog_items"("itemId");

-- CreateIndex
CREATE INDEX "marketing_catalog_items_syncStatus_idx" ON "marketing_catalog_items"("syncStatus");

-- CreateIndex
CREATE INDEX "marketing_catalog_items_itemType_idx" ON "marketing_catalog_items"("itemType");

-- CreateIndex
CREATE INDEX "marketing_sync_jobs_jobType_idx" ON "marketing_sync_jobs"("jobType");

-- CreateIndex
CREATE INDEX "marketing_sync_jobs_status_idx" ON "marketing_sync_jobs"("status");

-- CreateIndex
CREATE INDEX "marketing_sync_jobs_startedAt_idx" ON "marketing_sync_jobs"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "marketing_campaigns_cache_externalId_key" ON "marketing_campaigns_cache"("externalId");

-- CreateIndex
CREATE INDEX "marketing_campaigns_cache_status_idx" ON "marketing_campaigns_cache"("status");

-- CreateIndex
CREATE INDEX "marketing_campaigns_cache_externalId_idx" ON "marketing_campaigns_cache"("externalId");

-- AddForeignKey
ALTER TABLE "marketing_events" ADD CONSTRAINT "marketing_events_attributionId_fkey" FOREIGN KEY ("attributionId") REFERENCES "marketing_attributions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_events" ADD CONSTRAINT "marketing_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_events" ADD CONSTRAINT "marketing_events_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_events" ADD CONSTRAINT "marketing_events_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_attributions" ADD CONSTRAINT "marketing_attributions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
