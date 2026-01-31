/*
  Warnings:

  - The values [APPROVED,REJECTED] on the enum `journal_status` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `body_builder` on the `operational_trip` table. All the data in the column will be lost.
  - You are about to drop the column `body_builder` on the `rental_trip` table. All the data in the column will be lost.
  - You are about to drop the `operational_trip_employee` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payroll_attendance_cache` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payroll_benefit_cache` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payroll_benefit_type_cache` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payroll_cache` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payroll_deduction_cache` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payroll_deduction_type_cache` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rental_trip_employee` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `department_id` on the `employees_cache` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "journal_status_new" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');
ALTER TABLE "public"."journal_entry" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "journal_entry" ALTER COLUMN "status" TYPE "journal_status_new" USING ("status"::text::"journal_status_new");
ALTER TYPE "journal_status" RENAME TO "journal_status_old";
ALTER TYPE "journal_status_new" RENAME TO "journal_status";
DROP TYPE "public"."journal_status_old";
ALTER TABLE "journal_entry" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- DropForeignKey
ALTER TABLE "operational_trip_employee" DROP CONSTRAINT "operational_trip_employee_assignment_id_bus_trip_id_fkey";

-- DropForeignKey
ALTER TABLE "operational_trip_employee" DROP CONSTRAINT "operational_trip_employee_employee_number_fkey";

-- DropForeignKey
ALTER TABLE "payroll_attendance_cache" DROP CONSTRAINT "payroll_attendance_cache_payroll_id_fkey";

-- DropForeignKey
ALTER TABLE "payroll_benefit_cache" DROP CONSTRAINT "payroll_benefit_cache_benefit_type_id_fkey";

-- DropForeignKey
ALTER TABLE "payroll_benefit_cache" DROP CONSTRAINT "payroll_benefit_cache_payroll_id_fkey";

-- DropForeignKey
ALTER TABLE "payroll_cache" DROP CONSTRAINT "payroll_cache_employee_number_fkey";

-- DropForeignKey
ALTER TABLE "payroll_deduction_cache" DROP CONSTRAINT "payroll_deduction_cache_deduction_type_id_fkey";

-- DropForeignKey
ALTER TABLE "payroll_deduction_cache" DROP CONSTRAINT "payroll_deduction_cache_payroll_id_fkey";

-- DropForeignKey
ALTER TABLE "rental_trip_employee" DROP CONSTRAINT "rental_trip_employee_assignment_id_fkey";

-- DropForeignKey
ALTER TABLE "rental_trip_employee" DROP CONSTRAINT "rental_trip_employee_employee_number_fkey";

-- AlterTable
ALTER TABLE "employees_cache" ADD COLUMN     "barangay" TEXT,
ADD COLUMN     "zip_code" TEXT,
ALTER COLUMN "position_id" DROP NOT NULL,
DROP COLUMN "department_id",
ADD COLUMN     "department_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "operational_trip" DROP COLUMN "body_builder",
ADD COLUMN     "employee_conductor" TEXT,
ADD COLUMN     "employee_driver" TEXT,
ADD COLUMN     "is_expense_recorded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_revenue_recorded" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "rental_trip" DROP COLUMN "body_builder",
ADD COLUMN     "employees" TEXT,
ADD COLUMN     "is_expense_recorded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_revenue_recorded" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "revenue" ADD COLUMN     "conductor_receivable_id" INTEGER,
ADD COLUMN     "driver_receivable_id" INTEGER;

-- DropTable
DROP TABLE "operational_trip_employee";

-- DropTable
DROP TABLE "payroll_attendance_cache";

-- DropTable
DROP TABLE "payroll_benefit_cache";

-- DropTable
DROP TABLE "payroll_benefit_type_cache";

-- DropTable
DROP TABLE "payroll_cache";

-- DropTable
DROP TABLE "payroll_deduction_cache";

-- DropTable
DROP TABLE "payroll_deduction_type_cache";

-- DropTable
DROP TABLE "rental_trip_employee";

-- CreateIndex
CREATE INDEX "employees_cache_department_id_idx" ON "employees_cache"("department_id");

-- CreateIndex
CREATE INDEX "employees_cache_position_name_idx" ON "employees_cache"("position_name");

-- CreateIndex
CREATE INDEX "employees_cache_department_name_idx" ON "employees_cache"("department_name");

-- CreateIndex
CREATE INDEX "operational_trip_is_revenue_recorded_idx" ON "operational_trip"("is_revenue_recorded");

-- CreateIndex
CREATE INDEX "operational_trip_is_expense_recorded_idx" ON "operational_trip"("is_expense_recorded");

-- CreateIndex
CREATE INDEX "operational_trip_bus_plate_number_idx" ON "operational_trip"("bus_plate_number");

-- CreateIndex
CREATE INDEX "rental_trip_is_revenue_recorded_idx" ON "rental_trip"("is_revenue_recorded");

-- CreateIndex
CREATE INDEX "rental_trip_is_expense_recorded_idx" ON "rental_trip"("is_expense_recorded");

-- CreateIndex
CREATE INDEX "rental_trip_bus_plate_number_idx" ON "rental_trip"("bus_plate_number");

-- CreateIndex
CREATE INDEX "revenue_driver_receivable_id_idx" ON "revenue"("driver_receivable_id");

-- CreateIndex
CREATE INDEX "revenue_conductor_receivable_id_idx" ON "revenue"("conductor_receivable_id");

-- AddForeignKey
ALTER TABLE "revenue" ADD CONSTRAINT "revenue_driver_receivable_id_fkey" FOREIGN KEY ("driver_receivable_id") REFERENCES "receivable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue" ADD CONSTRAINT "revenue_conductor_receivable_id_fkey" FOREIGN KEY ("conductor_receivable_id") REFERENCES "receivable"("id") ON DELETE SET NULL ON UPDATE CASCADE;
