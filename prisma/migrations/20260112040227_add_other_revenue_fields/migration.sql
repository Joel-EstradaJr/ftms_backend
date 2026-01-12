-- DropIndex
DROP INDEX "receivable_debtor_name_idx";

-- DropIndex
DROP INDEX "receivable_due_date_idx";

-- AlterTable
ALTER TABLE "receivable" ADD COLUMN     "debtor_ref" TEXT;

-- AlterTable
ALTER TABLE "revenue_installment_schedule" ADD COLUMN     "carried_over_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "receivable_debtor_ref_idx" ON "receivable"("debtor_ref");
