/*
  Warnings:

  - You are about to drop the column `receipt_id` on the `ExpenseRecord` table. All the data in the column will be lost.
  - The primary key for the `GlobalCategory` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `applicable_modules` on the `GlobalCategory` table. All the data in the column will be lost.
  - You are about to drop the column `category_id` on the `GlobalCategory` table. All the data in the column will be lost.
  - You are about to drop the column `applicable_modules` on the `GlobalPaymentMethod` table. All the data in the column will be lost.
  - The primary key for the `GlobalSource` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `applicable_modules` on the `GlobalSource` table. All the data in the column will be lost.
  - You are about to drop the column `source_id` on the `GlobalSource` table. All the data in the column will be lost.
  - You are about to drop the column `applicable_modules` on the `GlobalTerms` table. All the data in the column will be lost.
  - You are about to drop the column `payroll_period` on the `PayrollFrequencyConfig` table. All the data in the column will be lost.
  - The `status` column on the `PayrollRecord` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `payment_method` on the `Reimbursement` table. All the data in the column will be lost.
  - You are about to drop the column `status_id` on the `Reimbursement` table. All the data in the column will be lost.
  - You are about to drop the `GlobalItemUnit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GlobalPaymentStatus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GlobalReimbursementStatus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Item` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ItemTransaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Receipt` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReceiptExport` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReceiptItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReceiptKeyword` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReceiptOCRField` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReceiptStorageConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReceiptStorageMetrics` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `payment_status` to the `ExpenseRecord` table without a default value. This is not possible if the table is not empty.
  - The required column `id` was added to the `GlobalCategory` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `id` was added to the `GlobalSource` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `payroll_frequency` to the `PayrollFrequencyConfig` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `payroll_period` on the `PayrollRecord` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `status` to the `Reimbursement` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ReimbursementStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'PENDING', 'VALIDATED', 'PAID');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('WEEKLY', 'SEMI_MONTHLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PENDING', 'DUE');

-- DropForeignKey
ALTER TABLE "ExpenseRecord" DROP CONSTRAINT "ExpenseRecord_category_id_fkey";

-- DropForeignKey
ALTER TABLE "ExpenseRecord" DROP CONSTRAINT "ExpenseRecord_receipt_id_fkey";

-- DropForeignKey
ALTER TABLE "ExpenseRecord" DROP CONSTRAINT "ExpenseRecord_source_id_fkey";

-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_category_id_fkey";

-- DropForeignKey
ALTER TABLE "Item" DROP CONSTRAINT "Item_unit_id_fkey";

-- DropForeignKey
ALTER TABLE "ItemTransaction" DROP CONSTRAINT "ItemTransaction_item_id_fkey";

-- DropForeignKey
ALTER TABLE "ItemTransaction" DROP CONSTRAINT "ItemTransaction_receipt_id_fkey";

-- DropForeignKey
ALTER TABLE "Receipt" DROP CONSTRAINT "Receipt_category_id_fkey";

-- DropForeignKey
ALTER TABLE "Receipt" DROP CONSTRAINT "Receipt_payment_status_id_fkey";

-- DropForeignKey
ALTER TABLE "Receipt" DROP CONSTRAINT "Receipt_source_id_fkey";

-- DropForeignKey
ALTER TABLE "Receipt" DROP CONSTRAINT "Receipt_terms_id_fkey";

-- DropForeignKey
ALTER TABLE "ReceiptExport" DROP CONSTRAINT "ReceiptExport_receipt_id_fkey";

-- DropForeignKey
ALTER TABLE "ReceiptItem" DROP CONSTRAINT "ReceiptItem_item_id_fkey";

-- DropForeignKey
ALTER TABLE "ReceiptItem" DROP CONSTRAINT "ReceiptItem_receipt_id_fkey";

-- DropForeignKey
ALTER TABLE "ReceiptKeyword" DROP CONSTRAINT "ReceiptKeyword_receipt_id_fkey";

-- DropForeignKey
ALTER TABLE "ReceiptOCRField" DROP CONSTRAINT "ReceiptOCRField_receipt_id_fkey";

-- DropForeignKey
ALTER TABLE "Reimbursement" DROP CONSTRAINT "Reimbursement_status_id_fkey";

-- DropForeignKey
ALTER TABLE "RevenueRecord" DROP CONSTRAINT "RevenueRecord_category_id_fkey";

-- DropForeignKey
ALTER TABLE "RevenueRecord" DROP CONSTRAINT "RevenueRecord_source_id_fkey";

-- DropIndex
DROP INDEX "ExpenseRecord_category_id_receipt_id_expense_date_key";

-- DropIndex
DROP INDEX "ExpenseRecord_receipt_id_key";

-- AlterTable
ALTER TABLE "ExpenseRecord" DROP COLUMN "receipt_id",
ADD COLUMN     "payment_status" "PaymentStatus" NOT NULL;

-- AlterTable
ALTER TABLE "GlobalCategory" DROP CONSTRAINT "GlobalCategory_pkey",
DROP COLUMN "applicable_modules",
DROP COLUMN "category_id",
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD CONSTRAINT "GlobalCategory_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "GlobalPaymentMethod" DROP COLUMN "applicable_modules",
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "GlobalSource" DROP CONSTRAINT "GlobalSource_pkey",
DROP COLUMN "applicable_modules",
DROP COLUMN "source_id",
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD CONSTRAINT "GlobalSource_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "GlobalTerms" DROP COLUMN "applicable_modules",
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "PayrollFrequencyConfig" DROP COLUMN "payroll_period",
ADD COLUMN     "payroll_frequency" "Frequency" NOT NULL;

-- AlterTable
ALTER TABLE "PayrollRecord" DROP COLUMN "payroll_period",
ADD COLUMN     "payroll_period" "Frequency" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "PayrollStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Reimbursement" DROP COLUMN "payment_method",
DROP COLUMN "status_id",
ADD COLUMN     "payment_method_id" TEXT,
ADD COLUMN     "status" "ReimbursementStatus" NOT NULL;

-- DropTable
DROP TABLE "GlobalItemUnit";

-- DropTable
DROP TABLE "GlobalPaymentStatus";

-- DropTable
DROP TABLE "GlobalReimbursementStatus";

-- DropTable
DROP TABLE "Item";

-- DropTable
DROP TABLE "ItemTransaction";

-- DropTable
DROP TABLE "Receipt";

-- DropTable
DROP TABLE "ReceiptExport";

-- DropTable
DROP TABLE "ReceiptItem";

-- DropTable
DROP TABLE "ReceiptKeyword";

-- DropTable
DROP TABLE "ReceiptOCRField";

-- DropTable
DROP TABLE "ReceiptStorageConfig";

-- DropTable
DROP TABLE "ReceiptStorageMetrics";

-- DropEnum
DROP TYPE "ExportFormat";

-- CreateTable
CREATE TABLE "ModuleCategory" (
    "id" TEXT NOT NULL,
    "module_name" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "ModuleCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleSource" (
    "id" TEXT NOT NULL,
    "module_name" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "ModuleSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleTerms" (
    "id" TEXT NOT NULL,
    "module_name" TEXT NOT NULL,
    "terms_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "ModuleTerms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModulePaymentMethod" (
    "id" TEXT NOT NULL,
    "module_name" TEXT NOT NULL,
    "payment_method_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "ModulePaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModuleCategory_module_name_idx" ON "ModuleCategory"("module_name");

-- CreateIndex
CREATE INDEX "ModuleCategory_category_id_idx" ON "ModuleCategory"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleCategory_module_name_category_id_key" ON "ModuleCategory"("module_name", "category_id");

-- CreateIndex
CREATE INDEX "ModuleSource_module_name_idx" ON "ModuleSource"("module_name");

-- CreateIndex
CREATE INDEX "ModuleSource_source_id_idx" ON "ModuleSource"("source_id");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleSource_module_name_source_id_key" ON "ModuleSource"("module_name", "source_id");

-- CreateIndex
CREATE INDEX "ModuleTerms_module_name_idx" ON "ModuleTerms"("module_name");

-- CreateIndex
CREATE INDEX "ModuleTerms_terms_id_idx" ON "ModuleTerms"("terms_id");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleTerms_module_name_terms_id_key" ON "ModuleTerms"("module_name", "terms_id");

-- CreateIndex
CREATE INDEX "ModulePaymentMethod_module_name_idx" ON "ModulePaymentMethod"("module_name");

-- CreateIndex
CREATE INDEX "ModulePaymentMethod_payment_method_id_idx" ON "ModulePaymentMethod"("payment_method_id");

-- CreateIndex
CREATE UNIQUE INDEX "ModulePaymentMethod_module_name_payment_method_id_key" ON "ModulePaymentMethod"("module_name", "payment_method_id");

-- AddForeignKey
ALTER TABLE "ExpenseRecord" ADD CONSTRAINT "ExpenseRecord_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "GlobalCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseRecord" ADD CONSTRAINT "ExpenseRecord_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "GlobalSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueRecord" ADD CONSTRAINT "RevenueRecord_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "GlobalCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueRecord" ADD CONSTRAINT "RevenueRecord_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "GlobalSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reimbursement" ADD CONSTRAINT "Reimbursement_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "GlobalPaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleCategory" ADD CONSTRAINT "ModuleCategory_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "GlobalCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleSource" ADD CONSTRAINT "ModuleSource_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "GlobalSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleTerms" ADD CONSTRAINT "ModuleTerms_terms_id_fkey" FOREIGN KEY ("terms_id") REFERENCES "GlobalTerms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModulePaymentMethod" ADD CONSTRAINT "ModulePaymentMethod_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "GlobalPaymentMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
