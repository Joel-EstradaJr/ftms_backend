/*
  Warnings:

  - The values [MANUAL] on the enum `entry_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "entry_type_new" AS ENUM ('AUTO_GENERATED');
ALTER TABLE "public"."journal_entry" ALTER COLUMN "entry_type" DROP DEFAULT;
ALTER TABLE "journal_entry" ALTER COLUMN "entry_type" TYPE "entry_type_new" USING ("entry_type"::text::"entry_type_new");
ALTER TYPE "entry_type" RENAME TO "entry_type_old";
ALTER TYPE "entry_type_new" RENAME TO "entry_type";
DROP TYPE "public"."entry_type_old";
ALTER TABLE "journal_entry" ALTER COLUMN "entry_type" SET DEFAULT 'AUTO_GENERATED';
COMMIT;

-- AlterEnum
ALTER TYPE "journal_status" ADD VALUE 'ADJUSTED';

-- AlterTable
ALTER TABLE "journal_entry" ADD COLUMN     "adjustment_of_id" INTEGER;

-- CreateIndex
CREATE INDEX "journal_entry_reversal_of_id_idx" ON "journal_entry"("reversal_of_id");

-- CreateIndex
CREATE INDEX "journal_entry_adjustment_of_id_idx" ON "journal_entry"("adjustment_of_id");

-- AddForeignKey
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_adjustment_of_id_fkey" FOREIGN KEY ("adjustment_of_id") REFERENCES "journal_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
