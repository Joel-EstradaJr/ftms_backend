/*
  Warnings:

  - A unique constraint covering the columns `[vendor]` on the table `expense` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "expense" ADD COLUMN     "invoice_number" TEXT,
ADD COLUMN     "vendor" TEXT;

-- AlterTable
ALTER TABLE "payable" ADD COLUMN     "frequency" "receivable_frequency" NOT NULL DEFAULT 'WEEKLY';

-- CreateIndex
CREATE UNIQUE INDEX "expense_vendor_key" ON "expense"("vendor");

-- CreateIndex
CREATE INDEX "expense_vendor_idx" ON "expense"("vendor");

-- CreateIndex
CREATE INDEX "expense_invoice_number_idx" ON "expense"("invoice_number");
