-- AlterTable
ALTER TABLE "bus_local" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "bus_trip_employee_local" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "bus_trip_local" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "employee_local" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "rental_employee_local" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "rental_local" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "bus_local_is_active_idx" ON "bus_local"("is_active");

-- CreateIndex
CREATE INDEX "bus_trip_employee_local_is_active_idx" ON "bus_trip_employee_local"("is_active");

-- CreateIndex
CREATE INDEX "bus_trip_local_is_active_idx" ON "bus_trip_local"("is_active");

-- CreateIndex
CREATE INDEX "employee_local_is_active_idx" ON "employee_local"("is_active");

-- CreateIndex
CREATE INDEX "rental_employee_local_is_active_idx" ON "rental_employee_local"("is_active");

-- CreateIndex
CREATE INDEX "rental_local_is_active_idx" ON "rental_local"("is_active");
