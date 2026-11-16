-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('WEBSITE', 'WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'PHONE', 'STORE', 'OTHER');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "createdByAdminId" INTEGER,
ADD COLUMN     "source" "OrderSource" NOT NULL DEFAULT 'WEBSITE';

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

