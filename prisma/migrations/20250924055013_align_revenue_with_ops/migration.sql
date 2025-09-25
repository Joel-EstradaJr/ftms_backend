/*
  Warnings:

  - A unique constraint covering the columns `[category_id,bus_trip_id]` on the table `RevenueRecord` will be added. If there are existing duplicate values, this will fail.
  - Made the column `updated_at` on table `RevenueRecord` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "RevenueRecord_category_id_assignment_id_collection_date_key";

-- AlterTable
ALTER TABLE "RevenueRecord" ADD COLUMN     "source_ref" TEXT,
ALTER COLUMN "created_by" SET DEFAULT 'system',
ALTER COLUMN "collection_date" SET DEFAULT CURRENT_TIMESTAMP;

-- Backfill updated_at where NULL prior to enforcing NOT NULL
UPDATE "RevenueRecord" SET "updated_at" = NOW() WHERE "updated_at" IS NULL;

-- Now enforce NOT NULL
ALTER TABLE "RevenueRecord" ALTER COLUMN "updated_at" SET NOT NULL;

-- CreateIndex
CREATE INDEX "RevenueRecord_assignment_id_idx" ON "RevenueRecord"("assignment_id");

-- CreateIndex
CREATE INDEX "RevenueRecord_bus_trip_id_idx" ON "RevenueRecord"("bus_trip_id");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueRecord_category_id_bus_trip_id_key" ON "RevenueRecord"("category_id", "bus_trip_id");
