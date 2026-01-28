/*
  Warnings:

  - You are about to drop the column `expected_installment` on the `payable` table. All the data in the column will be lost.
  - You are about to drop the column `expected_installment` on the `receivable` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "payable" DROP COLUMN "expected_installment";

-- AlterTable
ALTER TABLE "receivable" DROP COLUMN "expected_installment",
ADD COLUMN     "frequency" "receivable_frequency" NOT NULL DEFAULT 'WEEKLY',
ADD COLUMN     "number_of_payments" INTEGER;
