/*
  Warnings:

  - The primary key for the `EmployeeCache` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `employee_id` on the `EmployeeCache` table. All the data in the column will be lost.
  - You are about to drop the column `job_title` on the `EmployeeCache` table. All the data in the column will be lost.
  - You are about to drop the column `last_updated` on the `EmployeeCache` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `EmployeeCache` table. All the data in the column will be lost.
  - Added the required column `department` to the `EmployeeCache` table without a default value. This is not possible if the table is not empty.
  - Added the required column `department_id` to the `EmployeeCache` table without a default value. This is not possible if the table is not empty.
  - Added the required column `employee_number` to the `EmployeeCache` table without a default value. This is not possible if the table is not empty.
  - Added the required column `first_name` to the `EmployeeCache` table without a default value. This is not possible if the table is not empty.
  - Added the required column `last_name` to the `EmployeeCache` table without a default value. This is not possible if the table is not empty.
  - Added the required column `position` to the `EmployeeCache` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `EmployeeCache` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EmployeeCache" DROP CONSTRAINT "EmployeeCache_pkey",
DROP COLUMN "employee_id",
DROP COLUMN "job_title",
DROP COLUMN "last_updated",
DROP COLUMN "name",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "department" TEXT NOT NULL,
ADD COLUMN     "department_id" INTEGER NOT NULL,
ADD COLUMN     "employee_number" TEXT NOT NULL,
ADD COLUMN     "first_name" TEXT NOT NULL,
ADD COLUMN     "last_name" TEXT NOT NULL,
ADD COLUMN     "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "middle_name" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "position" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "EmployeeCache_pkey" PRIMARY KEY ("employee_number");

-- CreateTable
CREATE TABLE "PayrollCache" (
    "employee_number" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "last_name" TEXT NOT NULL,
    "suffix" TEXT,
    "employee_status" TEXT NOT NULL,
    "hire_date" TIMESTAMP(3) NOT NULL,
    "termination_date" TIMESTAMP(3),
    "basic_rate" DECIMAL(20,4) NOT NULL,
    "position_name" TEXT NOT NULL,
    "department_name" TEXT NOT NULL,
    "attendances" JSONB,
    "benefits" JSONB,
    "deductions" JSONB,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollCache_pkey" PRIMARY KEY ("employee_number")
);

-- CreateTable
CREATE TABLE "BusTripCache" (
    "assignment_id" TEXT NOT NULL,
    "bus_trip_id" TEXT NOT NULL,
    "bus_route" TEXT NOT NULL,
    "is_revenue_recorded" BOOLEAN NOT NULL DEFAULT false,
    "is_expense_recorded" BOOLEAN NOT NULL DEFAULT false,
    "date_assigned" TIMESTAMP(3) NOT NULL,
    "trip_fuel_expense" DECIMAL(20,4) NOT NULL,
    "trip_revenue" DECIMAL(20,4) NOT NULL,
    "assignment_type" TEXT NOT NULL,
    "assignment_value" DECIMAL(20,4) NOT NULL,
    "payment_method" TEXT NOT NULL,
    "driver_name" TEXT NOT NULL,
    "conductor_name" TEXT NOT NULL,
    "bus_plate_number" TEXT NOT NULL,
    "bus_type" TEXT NOT NULL,
    "body_number" TEXT NOT NULL,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusTripCache_pkey" PRIMARY KEY ("assignment_id")
);

-- CreateIndex
CREATE INDEX "PayrollCache_department_name_idx" ON "PayrollCache"("department_name");

-- CreateIndex
CREATE INDEX "PayrollCache_employee_status_idx" ON "PayrollCache"("employee_status");

-- CreateIndex
CREATE INDEX "BusTripCache_date_assigned_idx" ON "BusTripCache"("date_assigned");

-- CreateIndex
CREATE INDEX "BusTripCache_is_revenue_recorded_idx" ON "BusTripCache"("is_revenue_recorded");

-- CreateIndex
CREATE UNIQUE INDEX "BusTripCache_bus_trip_id_key" ON "BusTripCache"("bus_trip_id");

-- CreateIndex
CREATE INDEX "EmployeeCache_department_id_idx" ON "EmployeeCache"("department_id");

-- CreateIndex
CREATE INDEX "EmployeeCache_department_idx" ON "EmployeeCache"("department");
