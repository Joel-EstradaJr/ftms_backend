/*
  Warnings:

  - You are about to drop the column `status` on the `expense` table. All the data in the column will be lost.
  - The `status` column on the `payable` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `receivable` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `remittance_status` on the `revenue` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `revenue` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "approval_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'WRITTEN_OFF');

-- DropIndex
DROP INDEX "expense_status_idx";

-- DropIndex
DROP INDEX "revenue_remittance_status_idx";

-- AlterTable
ALTER TABLE "expense" DROP COLUMN "status",
ADD COLUMN     "accounting_status" "journal_status" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "approval_status" "approval_status" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "payment_status" "payment_status" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "expense_installment_payment" ADD COLUMN     "accounting_status" "journal_status" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "payable" DROP COLUMN "status",
ADD COLUMN     "status" "payment_status" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "receivable" DROP COLUMN "status",
ADD COLUMN     "status" "payment_status" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "revenue" DROP COLUMN "remittance_status",
DROP COLUMN "status",
ADD COLUMN     "accounting_status" "journal_status" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "approval_status" "approval_status" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "payment_status" "payment_status" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "revenue_installment_payment" ADD COLUMN     "accounting_status" "journal_status" NOT NULL DEFAULT 'DRAFT';

-- DropEnum
DROP TYPE "expense_status";

-- DropEnum
DROP TYPE "payable_status";

-- DropEnum
DROP TYPE "receivable_status";

-- DropEnum
DROP TYPE "revenue_accounting_status";

-- DropEnum
DROP TYPE "revenue_status";

-- CreateIndex
CREATE INDEX "expense_approval_status_idx" ON "expense"("approval_status");

-- CreateIndex
CREATE INDEX "payable_status_idx" ON "payable"("status");

-- CreateIndex
CREATE INDEX "receivable_status_idx" ON "receivable"("status");

-- CreateIndex
CREATE INDEX "revenue_payment_status_idx" ON "revenue"("payment_status");
