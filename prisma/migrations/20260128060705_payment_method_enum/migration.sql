/*
  Warnings:

  - The `payment_method` column on the `expense` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `payment_method` column on the `expense_installment_payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `payment_method` column on the `revenue` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `payment_method` column on the `revenue_installment_payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('CASH', 'BANK_TRANSFER', 'ONLINE', 'REIMBURSEMENT');

-- AlterTable
ALTER TABLE "expense" DROP COLUMN "payment_method",
ADD COLUMN     "payment_method" "payment_method" DEFAULT 'CASH';

-- AlterTable
ALTER TABLE "expense_installment_payment" DROP COLUMN "payment_method",
ADD COLUMN     "payment_method" "payment_method" DEFAULT 'CASH';

-- AlterTable
ALTER TABLE "receivable" ADD COLUMN     "installment_start_date" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "revenue" DROP COLUMN "payment_method",
ADD COLUMN     "payment_method" "payment_method" DEFAULT 'CASH';

-- AlterTable
ALTER TABLE "revenue_installment_payment" DROP COLUMN "payment_method",
ADD COLUMN     "payment_method" "payment_method" DEFAULT 'CASH';

-- DropEnum
DROP TYPE "payment_method_enum";

-- CreateIndex
CREATE INDEX "expense_payment_method_idx" ON "expense"("payment_method");

-- CreateIndex
CREATE INDEX "revenue_payment_method_idx" ON "revenue"("payment_method");
