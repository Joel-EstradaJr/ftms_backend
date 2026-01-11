/*
  Warnings:

  - A unique constraint covering the columns `[payroll_period_id,employee_number]` on the table `payroll` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "cash_advance_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISBURSED');

-- CreateEnum
CREATE TYPE "repayment_method" AS ENUM ('DEDUCTION_FROM_NEXT_PAYROLL', 'DEDUCTION_OVER_PERIODS');

-- CreateEnum
CREATE TYPE "repayment_frequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "payroll_item" ADD COLUMN     "effective_date" TIMESTAMP(3),
ADD COLUMN     "end_date" TIMESTAMP(3),
ADD COLUMN     "frequency" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "cash_advance_request" (
    "id" SERIAL NOT NULL,
    "request_number" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "employee_name" TEXT NOT NULL,
    "employee_position" TEXT,
    "employee_department" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "purpose" TEXT,
    "repayment_method" "repayment_method" NOT NULL,
    "repayment_frequency" "repayment_frequency",
    "number_of_repayment_periods" INTEGER,
    "status" "cash_advance_status" NOT NULL DEFAULT 'PENDING',
    "approved_amount" DECIMAL(12,2),
    "rejection_reason" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "cash_advance_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cash_advance_request_request_number_key" ON "cash_advance_request"("request_number");

-- CreateIndex
CREATE INDEX "cash_advance_request_request_number_idx" ON "cash_advance_request"("request_number");

-- CreateIndex
CREATE INDEX "cash_advance_request_employee_id_idx" ON "cash_advance_request"("employee_id");

-- CreateIndex
CREATE INDEX "cash_advance_request_status_idx" ON "cash_advance_request"("status");

-- CreateIndex
CREATE INDEX "cash_advance_request_created_at_idx" ON "cash_advance_request"("created_at");

-- CreateIndex
CREATE INDEX "cash_advance_request_is_deleted_idx" ON "cash_advance_request"("is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_payroll_period_id_employee_number_key" ON "payroll"("payroll_period_id", "employee_number");

-- CreateIndex
CREATE INDEX "payroll_item_is_active_idx" ON "payroll_item"("is_active");
