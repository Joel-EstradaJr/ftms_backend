-- AlterTable
ALTER TABLE "PayrollFrequencyConfig" ADD COLUMN     "frequency_id" TEXT;

-- AlterTable
ALTER TABLE "PayrollRecord" ADD COLUMN     "payroll_period_id" TEXT,
ADD COLUMN     "payroll_status_id" TEXT;

-- AlterTable
ALTER TABLE "Reimbursement" ADD COLUMN     "reimbursement_status_id" TEXT;

-- AlterTable
ALTER TABLE "RevenueInstallment" ADD COLUMN     "installment_status_id" TEXT;

-- AlterTable
ALTER TABLE "RevenueRecord" ADD COLUMN     "schedule_type_id" TEXT;

-- CreateIndex
CREATE INDEX "PayrollRecord_payroll_period_id_idx" ON "PayrollRecord"("payroll_period_id");

-- CreateIndex
CREATE INDEX "PayrollRecord_payroll_status_id_idx" ON "PayrollRecord"("payroll_status_id");

-- CreateIndex
CREATE INDEX "Reimbursement_reimbursement_status_id_idx" ON "Reimbursement"("reimbursement_status_id");

-- CreateIndex
CREATE INDEX "RevenueInstallment_installment_status_id_idx" ON "RevenueInstallment"("installment_status_id");

-- AddForeignKey
ALTER TABLE "RevenueRecord" ADD CONSTRAINT "RevenueRecord_schedule_type_id_fkey" FOREIGN KEY ("schedule_type_id") REFERENCES "GlobalScheduleType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueInstallment" ADD CONSTRAINT "RevenueInstallment_installment_status_id_fkey" FOREIGN KEY ("installment_status_id") REFERENCES "GlobalInstallmentStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reimbursement" ADD CONSTRAINT "Reimbursement_reimbursement_status_id_fkey" FOREIGN KEY ("reimbursement_status_id") REFERENCES "GlobalReimbursementStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollFrequencyConfig" ADD CONSTRAINT "PayrollFrequencyConfig_frequency_id_fkey" FOREIGN KEY ("frequency_id") REFERENCES "GlobalFrequency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRecord" ADD CONSTRAINT "PayrollRecord_payroll_period_id_fkey" FOREIGN KEY ("payroll_period_id") REFERENCES "GlobalFrequency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRecord" ADD CONSTRAINT "PayrollRecord_payroll_status_id_fkey" FOREIGN KEY ("payroll_status_id") REFERENCES "GlobalPayrollStatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
