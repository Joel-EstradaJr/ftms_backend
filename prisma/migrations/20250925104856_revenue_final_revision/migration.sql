/*
  Warnings:

  - Added the required column `payment_status_id` to the `RevenueRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RevenueRecord" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "deleted_by" TEXT DEFAULT 'ftms_user',
ADD COLUMN     "payment_method_id" TEXT,
ADD COLUMN     "payment_status_id" TEXT NOT NULL,
ADD COLUMN     "remarks" VARCHAR(500),
ADD COLUMN     "updated_by" TEXT NOT NULL DEFAULT 'ftms_user',
ALTER COLUMN "created_by" SET DEFAULT 'ftms_user';

-- CreateTable
CREATE TABLE "RevenueAttachment" (
    "id" TEXT NOT NULL,
    "revenue_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenueAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RevenueAttachment_revenue_id_idx" ON "RevenueAttachment"("revenue_id");

-- CreateIndex
CREATE INDEX "RevenueRecord_payment_status_id_idx" ON "RevenueRecord"("payment_status_id");

-- CreateIndex
CREATE INDEX "RevenueRecord_payment_method_id_idx" ON "RevenueRecord"("payment_method_id");

-- AddForeignKey
ALTER TABLE "RevenueRecord" ADD CONSTRAINT "RevenueRecord_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "GlobalPaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueRecord" ADD CONSTRAINT "RevenueRecord_payment_status_id_fkey" FOREIGN KEY ("payment_status_id") REFERENCES "GlobalPaymentStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueAttachment" ADD CONSTRAINT "RevenueAttachment_revenue_id_fkey" FOREIGN KEY ("revenue_id") REFERENCES "RevenueRecord"("revenue_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_revenue_id_fkey" FOREIGN KEY ("revenue_id") REFERENCES "RevenueRecord"("revenue_id") ON DELETE RESTRICT ON UPDATE CASCADE;
