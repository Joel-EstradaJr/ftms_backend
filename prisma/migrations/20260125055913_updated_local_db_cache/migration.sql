/*
  Warnings:

  - You are about to drop the column `approval_status` on the `expense` table. All the data in the column will be lost.
  - You are about to drop the column `operational_trip_assignment_id` on the `expense` table. All the data in the column will be lost.
  - You are about to drop the column `operational_trip_bus_trip_id` on the `expense` table. All the data in the column will be lost.
  - You are about to drop the column `rental_trip_assignment_id` on the `expense` table. All the data in the column will be lost.
  - The `payment_method` column on the `expense` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `operational_trip_assignment_id` on the `revenue` table. All the data in the column will be lost.
  - You are about to drop the column `operational_trip_bus_trip_id` on the `revenue` table. All the data in the column will be lost.
  - You are about to drop the column `rental_trip_assignment_id` on the `revenue` table. All the data in the column will be lost.
  - You are about to drop the `employees_cache` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `operational_trip` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rental_trip` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "payment_method_enum" AS ENUM ('CASH', 'BANK_TRANSFER', 'ONLINE');

-- CreateEnum
CREATE TYPE "bus_trip_employee_role" AS ENUM ('DRIVER', 'CONDUCTOR');

-- DropForeignKey
ALTER TABLE "expense" DROP CONSTRAINT "expense_operational_trip_assignment_id_operational_trip_bu_fkey";

-- DropForeignKey
ALTER TABLE "expense" DROP CONSTRAINT "expense_rental_trip_assignment_id_fkey";

-- DropForeignKey
ALTER TABLE "payroll" DROP CONSTRAINT "payroll_employee_number_fkey";

-- DropForeignKey
ALTER TABLE "revenue" DROP CONSTRAINT "revenue_operational_trip_assignment_id_operational_trip_bu_fkey";

-- DropForeignKey
ALTER TABLE "revenue" DROP CONSTRAINT "revenue_rental_trip_assignment_id_fkey";

-- DropIndex
DROP INDEX "expense_approval_status_idx";

-- DropIndex
DROP INDEX "expense_approval_status_operational_trip_assignment_id_oper_idx";

-- DropIndex
DROP INDEX "expense_rental_trip_assignment_id_idx";

-- DropIndex
DROP INDEX "revenue_approval_status_operational_trip_assignment_id_oper_idx";

-- DropIndex
DROP INDEX "revenue_rental_trip_assignment_id_idx";

-- AlterTable
ALTER TABLE "expense" DROP COLUMN "approval_status",
DROP COLUMN "operational_trip_assignment_id",
DROP COLUMN "operational_trip_bus_trip_id",
DROP COLUMN "rental_trip_assignment_id",
ADD COLUMN     "bus_trip_assignment_id" TEXT,
ADD COLUMN     "bus_trip_id" TEXT,
ADD COLUMN     "rental_assignment_id" TEXT,
DROP COLUMN "payment_method",
ADD COLUMN     "payment_method" "payment_method_enum";

-- AlterTable
ALTER TABLE "payable" ADD COLUMN     "employee_reference" TEXT;

-- AlterTable
ALTER TABLE "revenue" DROP COLUMN "operational_trip_assignment_id",
DROP COLUMN "operational_trip_bus_trip_id",
DROP COLUMN "rental_trip_assignment_id",
ADD COLUMN     "bus_trip_assignment_id" TEXT,
ADD COLUMN     "bus_trip_id" TEXT,
ADD COLUMN     "rental_assignment_id" TEXT;

-- DropTable
DROP TABLE "employees_cache";

-- DropTable
DROP TABLE "operational_trip";

-- DropTable
DROP TABLE "rental_trip";

-- DropEnum
DROP TYPE "expense_approval_status";

-- CreateTable
CREATE TABLE "employee_local" (
    "employee_number" TEXT NOT NULL,
    "first_name" TEXT,
    "middle_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "position" TEXT,
    "barangay" TEXT,
    "zip_code" TEXT,
    "department_id" INTEGER,
    "department" TEXT,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_local_pkey" PRIMARY KEY ("employee_number")
);

-- CreateTable
CREATE TABLE "bus_local" (
    "bus_id" TEXT NOT NULL,
    "license_plate" TEXT,
    "body_number" TEXT,
    "type" TEXT,
    "capacity" INTEGER,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bus_local_pkey" PRIMARY KEY ("bus_id")
);

-- CreateTable
CREATE TABLE "rental_local" (
    "assignment_id" TEXT NOT NULL,
    "bus_id" TEXT,
    "rental_status" TEXT,
    "rental_package" TEXT,
    "rental_start_date" TIMESTAMP(3),
    "rental_end_date" TIMESTAMP(3),
    "total_rental_amount" DECIMAL(14,2),
    "down_payment_amount" DECIMAL(14,2),
    "balance_amount" DECIMAL(14,2),
    "down_payment_date" TIMESTAMP(3),
    "full_payment_date" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "is_revenue_recorded" BOOLEAN NOT NULL DEFAULT false,
    "is_expense_recorded" BOOLEAN NOT NULL DEFAULT false,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rental_local_pkey" PRIMARY KEY ("assignment_id")
);

-- CreateTable
CREATE TABLE "rental_employee_local" (
    "assignment_id" TEXT NOT NULL,
    "employee_number" TEXT NOT NULL,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rental_employee_local_pkey" PRIMARY KEY ("assignment_id","employee_number")
);

-- CreateTable
CREATE TABLE "bus_trip_local" (
    "assignment_id" TEXT NOT NULL,
    "bus_trip_id" TEXT NOT NULL,
    "bus_id" TEXT,
    "bus_route" TEXT,
    "date_assigned" TIMESTAMP(3),
    "trip_fuel_expense" DECIMAL(14,2),
    "trip_revenue" DECIMAL(14,2),
    "assignment_type" TEXT,
    "assignment_value" DECIMAL(14,2),
    "payment_method" TEXT,
    "is_revenue_recorded" BOOLEAN NOT NULL DEFAULT false,
    "is_expense_recorded" BOOLEAN NOT NULL DEFAULT false,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bus_trip_local_pkey" PRIMARY KEY ("assignment_id","bus_trip_id")
);

-- CreateTable
CREATE TABLE "bus_trip_employee_local" (
    "assignment_id" TEXT NOT NULL,
    "bus_trip_id" TEXT NOT NULL,
    "employee_number" TEXT NOT NULL,
    "role" "bus_trip_employee_role" NOT NULL,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bus_trip_employee_local_pkey" PRIMARY KEY ("assignment_id","bus_trip_id","employee_number")
);

-- CreateIndex
CREATE INDEX "employee_local_last_synced_at_idx" ON "employee_local"("last_synced_at");

-- CreateIndex
CREATE INDEX "employee_local_department_id_idx" ON "employee_local"("department_id");

-- CreateIndex
CREATE INDEX "employee_local_position_idx" ON "employee_local"("position");

-- CreateIndex
CREATE INDEX "employee_local_department_idx" ON "employee_local"("department");

-- CreateIndex
CREATE INDEX "bus_local_license_plate_idx" ON "bus_local"("license_plate");

-- CreateIndex
CREATE INDEX "bus_local_body_number_idx" ON "bus_local"("body_number");

-- CreateIndex
CREATE INDEX "bus_local_last_synced_at_idx" ON "bus_local"("last_synced_at");

-- CreateIndex
CREATE INDEX "rental_local_bus_id_idx" ON "rental_local"("bus_id");

-- CreateIndex
CREATE INDEX "rental_local_rental_status_idx" ON "rental_local"("rental_status");

-- CreateIndex
CREATE INDEX "rental_local_rental_start_date_idx" ON "rental_local"("rental_start_date");

-- CreateIndex
CREATE INDEX "rental_local_rental_end_date_idx" ON "rental_local"("rental_end_date");

-- CreateIndex
CREATE INDEX "rental_local_is_revenue_recorded_idx" ON "rental_local"("is_revenue_recorded");

-- CreateIndex
CREATE INDEX "rental_local_is_expense_recorded_idx" ON "rental_local"("is_expense_recorded");

-- CreateIndex
CREATE INDEX "rental_local_last_synced_at_idx" ON "rental_local"("last_synced_at");

-- CreateIndex
CREATE INDEX "rental_employee_local_assignment_id_idx" ON "rental_employee_local"("assignment_id");

-- CreateIndex
CREATE INDEX "rental_employee_local_employee_number_idx" ON "rental_employee_local"("employee_number");

-- CreateIndex
CREATE INDEX "bus_trip_local_bus_id_idx" ON "bus_trip_local"("bus_id");

-- CreateIndex
CREATE INDEX "bus_trip_local_date_assigned_idx" ON "bus_trip_local"("date_assigned");

-- CreateIndex
CREATE INDEX "bus_trip_local_bus_route_idx" ON "bus_trip_local"("bus_route");

-- CreateIndex
CREATE INDEX "bus_trip_local_assignment_type_idx" ON "bus_trip_local"("assignment_type");

-- CreateIndex
CREATE INDEX "bus_trip_local_is_revenue_recorded_idx" ON "bus_trip_local"("is_revenue_recorded");

-- CreateIndex
CREATE INDEX "bus_trip_local_is_expense_recorded_idx" ON "bus_trip_local"("is_expense_recorded");

-- CreateIndex
CREATE INDEX "bus_trip_local_last_synced_at_idx" ON "bus_trip_local"("last_synced_at");

-- CreateIndex
CREATE INDEX "bus_trip_employee_local_assignment_id_bus_trip_id_idx" ON "bus_trip_employee_local"("assignment_id", "bus_trip_id");

-- CreateIndex
CREATE INDEX "bus_trip_employee_local_employee_number_idx" ON "bus_trip_employee_local"("employee_number");

-- CreateIndex
CREATE INDEX "bus_trip_employee_local_role_idx" ON "bus_trip_employee_local"("role");

-- CreateIndex
CREATE INDEX "expense_bus_trip_assignment_id_bus_trip_id_idx" ON "expense"("bus_trip_assignment_id", "bus_trip_id");

-- CreateIndex
CREATE INDEX "expense_payment_method_idx" ON "expense"("payment_method");

-- CreateIndex
CREATE INDEX "expense_rental_assignment_id_idx" ON "expense"("rental_assignment_id");

-- CreateIndex
CREATE INDEX "payable_employee_reference_idx" ON "payable"("employee_reference");

-- CreateIndex
CREATE INDEX "revenue_approval_status_bus_trip_assignment_id_bus_trip_id_idx" ON "revenue"("approval_status", "bus_trip_assignment_id", "bus_trip_id");

-- CreateIndex
CREATE INDEX "revenue_rental_assignment_id_idx" ON "revenue"("rental_assignment_id");

-- AddForeignKey
ALTER TABLE "rental_local" ADD CONSTRAINT "rental_local_bus_id_fkey" FOREIGN KEY ("bus_id") REFERENCES "bus_local"("bus_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_employee_local" ADD CONSTRAINT "rental_employee_local_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "rental_local"("assignment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_employee_local" ADD CONSTRAINT "rental_employee_local_employee_number_fkey" FOREIGN KEY ("employee_number") REFERENCES "employee_local"("employee_number") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_trip_local" ADD CONSTRAINT "bus_trip_local_bus_id_fkey" FOREIGN KEY ("bus_id") REFERENCES "bus_local"("bus_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_trip_employee_local" ADD CONSTRAINT "bus_trip_employee_local_assignment_id_bus_trip_id_fkey" FOREIGN KEY ("assignment_id", "bus_trip_id") REFERENCES "bus_trip_local"("assignment_id", "bus_trip_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bus_trip_employee_local" ADD CONSTRAINT "bus_trip_employee_local_employee_number_fkey" FOREIGN KEY ("employee_number") REFERENCES "employee_local"("employee_number") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue" ADD CONSTRAINT "revenue_bus_trip_assignment_id_bus_trip_id_fkey" FOREIGN KEY ("bus_trip_assignment_id", "bus_trip_id") REFERENCES "bus_trip_local"("assignment_id", "bus_trip_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue" ADD CONSTRAINT "revenue_rental_assignment_id_fkey" FOREIGN KEY ("rental_assignment_id") REFERENCES "rental_local"("assignment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_bus_trip_assignment_id_bus_trip_id_fkey" FOREIGN KEY ("bus_trip_assignment_id", "bus_trip_id") REFERENCES "bus_trip_local"("assignment_id", "bus_trip_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_rental_assignment_id_fkey" FOREIGN KEY ("rental_assignment_id") REFERENCES "rental_local"("assignment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_employee_number_fkey" FOREIGN KEY ("employee_number") REFERENCES "employee_local"("employee_number") ON DELETE RESTRICT ON UPDATE CASCADE;
