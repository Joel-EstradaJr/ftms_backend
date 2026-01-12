/*
  Warnings:

  - A unique constraint covering the columns `[payroll_period_id,employee_number]` on the table `payroll` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "payroll_item" ADD COLUMN     "effective_date" TIMESTAMP(3),
ADD COLUMN     "end_date" TIMESTAMP(3),
ADD COLUMN     "frequency" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "payroll_payroll_period_id_employee_number_key" ON "payroll"("payroll_period_id", "employee_number");

-- CreateIndex
CREATE INDEX "payroll_item_is_active_idx" ON "payroll_item"("is_active");
