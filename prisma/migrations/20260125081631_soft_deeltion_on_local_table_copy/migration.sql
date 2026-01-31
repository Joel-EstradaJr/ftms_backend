/*
  Warnings:

  - You are about to drop the column `status` on the `revenue` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "revenue_accounting_status" AS ENUM ('DRAFT', 'POSTED', 'ADJUSTED', 'REVERSED');

-- DropIndex
DROP INDEX "revenue_approval_status_bus_trip_assignment_id_bus_trip_id_idx";

-- DropIndex
DROP INDEX "revenue_date_expected_idx";

-- DropIndex
DROP INDEX "revenue_disposal_ref_idx";

-- DropIndex
DROP INDEX "revenue_status_idx";

-- AlterTable
ALTER TABLE "bus_local" ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "bus_trip_employee_local" ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "bus_trip_local" ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "employee_local" ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "rental_employee_local" ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "rental_local" ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "revenue" DROP COLUMN "status",
ADD COLUMN     "accounting_status" "revenue_accounting_status" NOT NULL DEFAULT 'DRAFT';

-- DropEnum
DROP TYPE "revenue_status";

-- CreateIndex
CREATE INDEX "bus_local_is_deleted_idx" ON "bus_local"("is_deleted");

-- CreateIndex
CREATE INDEX "bus_trip_employee_local_is_deleted_idx" ON "bus_trip_employee_local"("is_deleted");

-- CreateIndex
CREATE INDEX "bus_trip_local_is_deleted_idx" ON "bus_trip_local"("is_deleted");

-- CreateIndex
CREATE INDEX "employee_local_is_deleted_idx" ON "employee_local"("is_deleted");

-- CreateIndex
CREATE INDEX "rental_employee_local_is_deleted_idx" ON "rental_employee_local"("is_deleted");

-- CreateIndex
CREATE INDEX "rental_local_is_deleted_idx" ON "rental_local"("is_deleted");

-- CreateIndex
CREATE INDEX "revenue_accounting_status_idx" ON "revenue"("accounting_status");

-- CreateIndex
CREATE INDEX "revenue_bus_trip_assignment_id_bus_trip_id_idx" ON "revenue"("bus_trip_assignment_id", "bus_trip_id");
