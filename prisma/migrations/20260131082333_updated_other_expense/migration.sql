/*
  Warnings:

  - You are about to drop the column `vendor` on the `expense` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "expense_vendor_idx";

-- DropIndex
DROP INDEX "expense_vendor_key";

-- AlterTable
ALTER TABLE "expense" DROP COLUMN "vendor",
ADD COLUMN     "vendor_id" INTEGER;

-- CreateTable
CREATE TABLE "supplier_local" (
    "id" SERIAL NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "contact_number" TEXT,
    "email" TEXT,
    "street" TEXT,
    "barangay" TEXT,
    "city" TEXT,
    "province" TEXT,
    "status" TEXT DEFAULT 'ACTIVE',
    "remarks" TEXT,
    "date_created" TIMESTAMP(3),
    "date_updated" TIMESTAMP(3),
    "item_count" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_local_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "name" TEXT,
    "supplier_local_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "vendor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_local_supplier_id_key" ON "supplier_local"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_local_supplier_name_key" ON "supplier_local"("supplier_name");

-- CreateIndex
CREATE INDEX "supplier_local_supplier_id_idx" ON "supplier_local"("supplier_id");

-- CreateIndex
CREATE INDEX "supplier_local_supplier_name_idx" ON "supplier_local"("supplier_name");

-- CreateIndex
CREATE INDEX "supplier_local_status_idx" ON "supplier_local"("status");

-- CreateIndex
CREATE INDEX "supplier_local_is_active_idx" ON "supplier_local"("is_active");

-- CreateIndex
CREATE INDEX "supplier_local_is_deleted_idx" ON "supplier_local"("is_deleted");

-- CreateIndex
CREATE INDEX "supplier_local_last_synced_at_idx" ON "supplier_local"("last_synced_at");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_code_key" ON "vendor"("code");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_name_key" ON "vendor"("name");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_supplier_local_id_key" ON "vendor"("supplier_local_id");

-- CreateIndex
CREATE INDEX "vendor_code_idx" ON "vendor"("code");

-- CreateIndex
CREATE INDEX "vendor_name_idx" ON "vendor"("name");

-- CreateIndex
CREATE INDEX "vendor_supplier_local_id_idx" ON "vendor"("supplier_local_id");

-- CreateIndex
CREATE INDEX "vendor_is_active_idx" ON "vendor"("is_active");

-- CreateIndex
CREATE INDEX "vendor_is_deleted_idx" ON "vendor"("is_deleted");

-- CreateIndex
CREATE INDEX "expense_vendor_id_idx" ON "expense"("vendor_id");

-- AddForeignKey
ALTER TABLE "vendor" ADD CONSTRAINT "vendor_supplier_local_id_fkey" FOREIGN KEY ("supplier_local_id") REFERENCES "supplier_local"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
