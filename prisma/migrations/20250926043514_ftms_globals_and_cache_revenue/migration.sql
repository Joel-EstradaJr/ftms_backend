/*
  Warnings:

  - A unique constraint covering the columns `[assignment_id,bus_trip_id]` on the table `RevenueRecord` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "RevenueRecord_category_id_bus_trip_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "RevenueRecord_assignment_id_bus_trip_id_key" ON "RevenueRecord"("assignment_id", "bus_trip_id");
