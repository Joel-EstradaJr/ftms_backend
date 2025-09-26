/*
  Warnings:

  - You are about to drop the `RevenueAttachment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RevenueAttachment" DROP CONSTRAINT "RevenueAttachment_revenue_id_fkey";

-- AlterTable
ALTER TABLE "RevenueRecord" ADD COLUMN     "due_date" TIMESTAMP(3),
ADD COLUMN     "interest_rate" DECIMAL(10,4) NOT NULL DEFAULT 0,
ADD COLUMN     "is_receivable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payer_name" VARCHAR(255);

-- DropTable
DROP TABLE "RevenueAttachment";

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "module_name" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueInstallment" (
    "id" TEXT NOT NULL,
    "revenue_id" TEXT NOT NULL,
    "installment_number" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "amount_due" DECIMAL(20,4) NOT NULL,
    "amount_paid" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "payment_status_id" TEXT NOT NULL,
    "payment_method_id" TEXT,
    "paid_date" TIMESTAMP(3),

    CONSTRAINT "RevenueInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Attachment_module_name_record_id_idx" ON "Attachment"("module_name", "record_id");

-- CreateIndex
CREATE INDEX "RevenueInstallment_revenue_id_idx" ON "RevenueInstallment"("revenue_id");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueInstallment_revenue_id_installment_number_key" ON "RevenueInstallment"("revenue_id", "installment_number");

-- AddForeignKey
ALTER TABLE "RevenueInstallment" ADD CONSTRAINT "RevenueInstallment_revenue_id_fkey" FOREIGN KEY ("revenue_id") REFERENCES "RevenueRecord"("revenue_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueInstallment" ADD CONSTRAINT "RevenueInstallment_payment_status_id_fkey" FOREIGN KEY ("payment_status_id") REFERENCES "GlobalPaymentStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueInstallment" ADD CONSTRAINT "RevenueInstallment_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "GlobalPaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
