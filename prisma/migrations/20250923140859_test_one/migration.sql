/*
  Warnings:

  - You are about to drop the `ModuleCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ModulePaymentMethod` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ModulePaymentStatus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ModuleReimbursementStatus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ModuleSource` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ModuleTerms` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[receipt_id]` on the table `ExpenseRecord` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[category_id,receipt_id,expense_date]` on the table `ExpenseRecord` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('CSV', 'PDF', 'XSL');

-- DropForeignKey
ALTER TABLE "ModuleCategory" DROP CONSTRAINT "ModuleCategory_category_id_fkey";

-- DropForeignKey
ALTER TABLE "ModulePaymentMethod" DROP CONSTRAINT "ModulePaymentMethod_payment_method_id_fkey";

-- DropForeignKey
ALTER TABLE "ModulePaymentStatus" DROP CONSTRAINT "ModulePaymentStatus_payment_status_id_fkey";

-- DropForeignKey
ALTER TABLE "ModuleReimbursementStatus" DROP CONSTRAINT "ModuleReimbursementStatus_status_id_fkey";

-- DropForeignKey
ALTER TABLE "ModuleSource" DROP CONSTRAINT "ModuleSource_source_id_fkey";

-- DropForeignKey
ALTER TABLE "ModuleTerms" DROP CONSTRAINT "ModuleTerms_terms_id_fkey";

-- AlterTable
ALTER TABLE "ExpenseRecord" ADD COLUMN     "receipt_id" TEXT;

-- AlterTable
ALTER TABLE "GlobalCategory" ADD COLUMN     "applicable_modules" TEXT[];

-- AlterTable
ALTER TABLE "GlobalPaymentMethod" ADD COLUMN     "applicable_modules" TEXT[];

-- AlterTable
ALTER TABLE "GlobalPaymentStatus" ADD COLUMN     "applicable_modules" TEXT[];

-- AlterTable
ALTER TABLE "GlobalReimbursementStatus" ADD COLUMN     "applicable_modules" TEXT[];

-- AlterTable
ALTER TABLE "GlobalSource" ADD COLUMN     "applicable_modules" TEXT[];

-- AlterTable
ALTER TABLE "GlobalTerms" ADD COLUMN     "applicable_modules" TEXT[];

-- DropTable
DROP TABLE "ModuleCategory";

-- DropTable
DROP TABLE "ModulePaymentMethod";

-- DropTable
DROP TABLE "ModulePaymentStatus";

-- DropTable
DROP TABLE "ModuleReimbursementStatus";

-- DropTable
DROP TABLE "ModuleSource";

-- DropTable
DROP TABLE "ModuleTerms";

-- CreateTable
CREATE TABLE "Receipt" (
    "receipt_id" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "vat_reg_tin" TEXT,
    "date_paid" TIMESTAMP(3),
    "total_amount" DECIMAL(20,4) NOT NULL,
    "vat_amount" DECIMAL(20,4),
    "total_amount_due" DECIMAL(20,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deletion_reason" TEXT,
    "ocr_confidence" DOUBLE PRECISION,
    "ocr_file_path" TEXT,
    "remarks" TEXT,
    "storage_size_bytes" BIGINT,
    "updated_by" TEXT,
    "is_expense_recorded" BOOLEAN NOT NULL DEFAULT false,
    "category_id" TEXT NOT NULL,
    "source_id" TEXT,
    "payment_status_id" TEXT NOT NULL,
    "terms_id" TEXT NOT NULL,

    CONSTRAINT "Receipt_pkey" PRIMARY KEY ("receipt_id")
);

-- CreateTable
CREATE TABLE "ReceiptItem" (
    "receipt_item_id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(20,4) NOT NULL,
    "total_price" DECIMAL(20,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "ocr_confidence" DOUBLE PRECISION,
    "updated_by" TEXT,
    "item_id" TEXT NOT NULL,
    "is_inventory_processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ReceiptItem_pkey" PRIMARY KEY ("receipt_item_id")
);

-- CreateTable
CREATE TABLE "Item" (
    "item_id" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "category_id" TEXT NOT NULL,
    "unit_id" TEXT NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "ItemTransaction" (
    "transaction_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "receipt_id" TEXT,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(20,4) NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ItemTransaction_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "ReceiptExport" (
    "export_id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "exported_by" TEXT NOT NULL,
    "exported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filters_used" JSONB,
    "file_path" TEXT,

    CONSTRAINT "ReceiptExport_pkey" PRIMARY KEY ("export_id")
);

-- CreateTable
CREATE TABLE "ReceiptStorageConfig" (
    "config_id" TEXT NOT NULL,
    "auto_archive_months" INTEGER NOT NULL DEFAULT 6,
    "last_cleanup" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptStorageConfig_pkey" PRIMARY KEY ("config_id")
);

-- CreateTable
CREATE TABLE "ReceiptOCRField" (
    "field_id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "extracted_value" TEXT NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "original_image_coords" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "ReceiptOCRField_pkey" PRIMARY KEY ("field_id")
);

-- CreateTable
CREATE TABLE "ReceiptKeyword" (
    "keyword_id" TEXT NOT NULL,
    "receipt_id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptKeyword_pkey" PRIMARY KEY ("keyword_id")
);

-- CreateTable
CREATE TABLE "ReceiptStorageMetrics" (
    "metric_id" TEXT NOT NULL,
    "total_receipts" INTEGER NOT NULL DEFAULT 0,
    "storage_used_bytes" BIGINT NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "ReceiptStorageMetrics_pkey" PRIMARY KEY ("metric_id")
);

-- CreateTable
CREATE TABLE "GlobalItemUnit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "applicable_modules" TEXT[],

    CONSTRAINT "GlobalItemUnit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Receipt_transaction_date_is_deleted_idx" ON "Receipt"("transaction_date", "is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptItem_receipt_id_item_id_key" ON "ReceiptItem"("receipt_id", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "Item_item_name_key" ON "Item"("item_name");

-- CreateIndex
CREATE INDEX "Item_item_name_is_deleted_idx" ON "Item"("item_name", "is_deleted");

-- CreateIndex
CREATE INDEX "Item_category_id_is_deleted_idx" ON "Item"("category_id", "is_deleted");

-- CreateIndex
CREATE INDEX "Item_is_deleted_category_id_item_name_idx" ON "Item"("is_deleted", "category_id", "item_name");

-- CreateIndex
CREATE INDEX "ItemTransaction_item_id_transaction_date_idx" ON "ItemTransaction"("item_id", "transaction_date");

-- CreateIndex
CREATE INDEX "ItemTransaction_transaction_date_is_deleted_idx" ON "ItemTransaction"("transaction_date", "is_deleted");

-- CreateIndex
CREATE INDEX "ItemTransaction_is_deleted_transaction_date_idx" ON "ItemTransaction"("is_deleted", "transaction_date");

-- CreateIndex
CREATE INDEX "ItemTransaction_item_id_is_deleted_transaction_date_idx" ON "ItemTransaction"("item_id", "is_deleted", "transaction_date");

-- CreateIndex
CREATE UNIQUE INDEX "ReceiptOCRField_receipt_id_field_name_key" ON "ReceiptOCRField"("receipt_id", "field_name");

-- CreateIndex
CREATE INDEX "ReceiptKeyword_keyword_idx" ON "ReceiptKeyword"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalItemUnit_name_key" ON "GlobalItemUnit"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseRecord_receipt_id_key" ON "ExpenseRecord"("receipt_id");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseRecord_category_id_receipt_id_expense_date_key" ON "ExpenseRecord"("category_id", "receipt_id", "expense_date");

-- AddForeignKey
ALTER TABLE "ExpenseRecord" ADD CONSTRAINT "ExpenseRecord_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "Receipt"("receipt_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "GlobalCategory"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_payment_status_id_fkey" FOREIGN KEY ("payment_status_id") REFERENCES "GlobalPaymentStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "GlobalSource"("source_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_terms_id_fkey" FOREIGN KEY ("terms_id") REFERENCES "GlobalTerms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptItem" ADD CONSTRAINT "ReceiptItem_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "Item"("item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptItem" ADD CONSTRAINT "ReceiptItem_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "Receipt"("receipt_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "GlobalCategory"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "GlobalItemUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTransaction" ADD CONSTRAINT "ItemTransaction_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "Item"("item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTransaction" ADD CONSTRAINT "ItemTransaction_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "Receipt"("receipt_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptExport" ADD CONSTRAINT "ReceiptExport_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "Receipt"("receipt_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptOCRField" ADD CONSTRAINT "ReceiptOCRField_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "Receipt"("receipt_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceiptKeyword" ADD CONSTRAINT "ReceiptKeyword_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "Receipt"("receipt_id") ON DELETE RESTRICT ON UPDATE CASCADE;
