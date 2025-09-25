/*
  Warnings:

  - You are about to drop the column `receipt_id` on the `ExpenseRecord` table. All the data in the column will be lost.
  - You are about to drop the column `applicable_modules` on the `GlobalCategory` table. All the data in the column will be lost.
  - You are about to drop the column `applicable_modules` on the `GlobalPaymentMethod` table. All the data in the column will be lost.
  - You are about to drop the column `applicable_modules` on the `GlobalPaymentStatus` table. All the data in the column will be lost.
  - You are about to drop the column `applicable_modules` on the `GlobalReimbursementStatus` table. All the data in the column will be lost.
  - You are about to drop the column `applicable_modules` on the `GlobalSource` table. All the data in the column will be lost.
  - You are about to drop the column `applicable_modules` on the `GlobalTerms` table. All the data in the column will be lost.
  - You are about to drop the `GlobalItemUnit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Item` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ItemTransaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Receipt` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReceiptExport` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReceiptItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReceiptKeyword` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReceiptOCRField` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReceiptStorageConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReceiptStorageMetrics` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ExpenseRecord" DROP CONSTRAINT "ExpenseRecord_receipt_id_fkey";

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

-- DropIndex
DROP INDEX "ExpenseRecord_category_id_receipt_id_expense_date_key";

-- DropIndex
DROP INDEX "ExpenseRecord_receipt_id_key";

-- AlterTable
ALTER TABLE "ExpenseRecord" DROP COLUMN "receipt_id";

-- AlterTable
ALTER TABLE "GlobalCategory" DROP COLUMN "applicable_modules";

-- AlterTable
ALTER TABLE "GlobalPaymentMethod" DROP COLUMN "applicable_modules";

-- AlterTable
ALTER TABLE "GlobalPaymentStatus" DROP COLUMN "applicable_modules";

-- AlterTable
ALTER TABLE "GlobalReimbursementStatus" DROP COLUMN "applicable_modules";

-- AlterTable
ALTER TABLE "GlobalSource" DROP COLUMN "applicable_modules";

-- AlterTable
ALTER TABLE "GlobalTerms" DROP COLUMN "applicable_modules";

-- DropTable
DROP TABLE "GlobalItemUnit";

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
CREATE TABLE "ModulePaymentStatus" (
    "id" TEXT NOT NULL,
    "module_name" TEXT NOT NULL,
    "payment_status_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "ModulePaymentStatus_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "ModuleReimbursementStatus" (
    "id" TEXT NOT NULL,
    "module_name" TEXT NOT NULL,
    "status_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "ModuleReimbursementStatus_pkey" PRIMARY KEY ("id")
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
CREATE INDEX "ModulePaymentStatus_module_name_idx" ON "ModulePaymentStatus"("module_name");

-- CreateIndex
CREATE INDEX "ModulePaymentStatus_payment_status_id_idx" ON "ModulePaymentStatus"("payment_status_id");

-- CreateIndex
CREATE UNIQUE INDEX "ModulePaymentStatus_module_name_payment_status_id_key" ON "ModulePaymentStatus"("module_name", "payment_status_id");

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

-- CreateIndex
CREATE INDEX "ModuleReimbursementStatus_module_name_idx" ON "ModuleReimbursementStatus"("module_name");

-- CreateIndex
CREATE INDEX "ModuleReimbursementStatus_status_id_idx" ON "ModuleReimbursementStatus"("status_id");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleReimbursementStatus_module_name_status_id_key" ON "ModuleReimbursementStatus"("module_name", "status_id");

-- AddForeignKey
ALTER TABLE "ModuleCategory" ADD CONSTRAINT "ModuleCategory_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "GlobalCategory"("category_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleSource" ADD CONSTRAINT "ModuleSource_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "GlobalSource"("source_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModulePaymentStatus" ADD CONSTRAINT "ModulePaymentStatus_payment_status_id_fkey" FOREIGN KEY ("payment_status_id") REFERENCES "GlobalPaymentStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleTerms" ADD CONSTRAINT "ModuleTerms_terms_id_fkey" FOREIGN KEY ("terms_id") REFERENCES "GlobalTerms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModulePaymentMethod" ADD CONSTRAINT "ModulePaymentMethod_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "GlobalPaymentMethod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleReimbursementStatus" ADD CONSTRAINT "ModuleReimbursementStatus_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "GlobalReimbursementStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
