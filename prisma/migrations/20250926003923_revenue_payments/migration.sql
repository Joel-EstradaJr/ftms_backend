-- CreateTable
CREATE TABLE "RevenuePayment" (
    "id" TEXT NOT NULL,
    "revenue_id" TEXT NOT NULL,
    "installment_id" TEXT,
    "amount" DECIMAL(20,4) NOT NULL,
    "payment_status_id" TEXT NOT NULL,
    "payment_method_id" TEXT NOT NULL,
    "paid_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference_number" TEXT,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenuePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RevenuePayment_revenue_id_idx" ON "RevenuePayment"("revenue_id");

-- CreateIndex
CREATE INDEX "RevenuePayment_installment_id_idx" ON "RevenuePayment"("installment_id");

-- AddForeignKey
ALTER TABLE "RevenuePayment" ADD CONSTRAINT "RevenuePayment_revenue_id_fkey" FOREIGN KEY ("revenue_id") REFERENCES "RevenueRecord"("revenue_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenuePayment" ADD CONSTRAINT "RevenuePayment_installment_id_fkey" FOREIGN KEY ("installment_id") REFERENCES "RevenueInstallment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenuePayment" ADD CONSTRAINT "RevenuePayment_payment_status_id_fkey" FOREIGN KEY ("payment_status_id") REFERENCES "GlobalPaymentStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenuePayment" ADD CONSTRAINT "RevenuePayment_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "GlobalPaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
