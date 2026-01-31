/*
  Warnings:

  - You are about to drop the column `installment_plan` on the `payable` table. All the data in the column will be lost.
  - You are about to drop the column `employee_id` on the `receivable` table. All the data in the column will be lost.
  - You are about to drop the column `installment_plan` on the `receivable` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "receivable" DROP CONSTRAINT "receivable_employee_id_fkey";

-- DropIndex
DROP INDEX "receivable_employee_id_idx";

-- AlterTable
ALTER TABLE "payable" DROP COLUMN "installment_plan";

-- AlterTable
ALTER TABLE "receivable" DROP COLUMN "employee_id",
DROP COLUMN "installment_plan",
ADD COLUMN     "employee_number" TEXT;

-- CreateIndex
CREATE INDEX "receivable_employee_number_idx" ON "receivable"("employee_number");

-- AddForeignKey
ALTER TABLE "receivable" ADD CONSTRAINT "receivable_employee_number_fkey" FOREIGN KEY ("employee_number") REFERENCES "employee_local"("employee_number") ON DELETE SET NULL ON UPDATE CASCADE;
