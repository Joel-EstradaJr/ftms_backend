/*
  Warnings:

  - You are about to drop the `BusTripCache` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_busTripCacheId_fkey";

-- DropForeignKey
ALTER TABLE "Revenue" DROP CONSTRAINT "Revenue_busTripCacheId_fkey";

-- DropTable
DROP TABLE "BusTripCache";

-- CreateTable
CREATE TABLE "bus_trip_cache" (
    "id" SERIAL NOT NULL,
    "assignment_id" VARCHAR(20) NOT NULL,
    "bus_trip_id" VARCHAR(20) NOT NULL,
    "bus_route" VARCHAR(100) NOT NULL,
    "is_revenue_recorded" BOOLEAN NOT NULL DEFAULT false,
    "is_expense_recorded" BOOLEAN NOT NULL DEFAULT false,
    "date_assigned" TIMESTAMP(3) NOT NULL,
    "trip_fuel_expense" DECIMAL(15,2) NOT NULL,
    "trip_revenue" DECIMAL(15,2) NOT NULL,
    "assignment_type" VARCHAR(50) NOT NULL,
    "assignment_value" DECIMAL(15,4) NOT NULL,
    "payment_method" VARCHAR(50) NOT NULL,
    "driver_name" VARCHAR(100) NOT NULL,
    "conductor_name" VARCHAR(100) NOT NULL,
    "driver_employee_number" VARCHAR(20),
    "conductor_employee_number" VARCHAR(20),
    "bus_plate_number" VARCHAR(20) NOT NULL,
    "bus_type" VARCHAR(50) NOT NULL,
    "body_number" VARCHAR(20) NOT NULL,
    "route_code" VARCHAR(20),
    "trip_status" VARCHAR(50) DEFAULT 'COMPLETED',
    "last_synced" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bus_trip_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bus_trip_cache_assignment_id_key" ON "bus_trip_cache"("assignment_id");

-- CreateIndex
CREATE INDEX "bus_trip_cache_assignment_id_idx" ON "bus_trip_cache"("assignment_id");

-- CreateIndex
CREATE INDEX "bus_trip_cache_bus_trip_id_idx" ON "bus_trip_cache"("bus_trip_id");

-- CreateIndex
CREATE INDEX "bus_trip_cache_date_assigned_idx" ON "bus_trip_cache"("date_assigned");

-- CreateIndex
CREATE INDEX "bus_trip_cache_driver_employee_number_conductor_employee_nu_idx" ON "bus_trip_cache"("driver_employee_number", "conductor_employee_number");

-- CreateIndex
CREATE INDEX "Revenue_paymentMethodId_idx" ON "Revenue"("paymentMethodId");

-- AddForeignKey
ALTER TABLE "Revenue" ADD CONSTRAINT "Revenue_busTripCacheId_fkey" FOREIGN KEY ("busTripCacheId") REFERENCES "bus_trip_cache"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_busTripCacheId_fkey" FOREIGN KEY ("busTripCacheId") REFERENCES "bus_trip_cache"("id") ON DELETE SET NULL ON UPDATE CASCADE;
