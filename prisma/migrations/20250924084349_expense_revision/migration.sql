/*
  Warnings:

  - You are about to drop the column `payment_status` on the `ExpenseRecord` table. All the data in the column will be lost.
  - Added the required column `payment_status_id` to the `ExpenseRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ExpenseRecord" DROP COLUMN "payment_status",
ADD COLUMN     "payment_status_id" TEXT NOT NULL;

-- DropEnum
DROP TYPE "PaymentStatus";

-- CreateTable
CREATE TABLE "GlobalPaymentStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "applicable_modules" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "GlobalPaymentStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GlobalPaymentStatus_name_key" ON "GlobalPaymentStatus"("name");

-- AddForeignKey
ALTER TABLE "ExpenseRecord" ADD CONSTRAINT "ExpenseRecord_payment_status_id_fkey" FOREIGN KEY ("payment_status_id") REFERENCES "GlobalPaymentStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
