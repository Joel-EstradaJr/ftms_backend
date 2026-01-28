/*
  Warnings:

  - You are about to drop the column `accounting_status` on the `revenue` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "revenue_accounting_status_idx";

-- AlterTable
ALTER TABLE "revenue" DROP COLUMN "accounting_status",
ADD COLUMN     "remittance_status" "receivable_status" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "revenue_remittance_status_idx" ON "revenue"("remittance_status");
