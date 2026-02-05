/*
  Warnings:

  - The values [PAID] on the enum `payment_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "payment_status_new" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'COMPLETED', 'OVERDUE', 'CANCELLED', 'WRITTEN_OFF');
ALTER TABLE "expense" ALTER COLUMN "payment_status" DROP DEFAULT;
ALTER TABLE "payable" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "receivable" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "revenue" ALTER COLUMN "payment_status" DROP DEFAULT;
ALTER TABLE "revenue" ALTER COLUMN "payment_status" TYPE "payment_status_new" USING ("payment_status"::text::"payment_status_new");
ALTER TABLE "receivable" ALTER COLUMN "status" TYPE "payment_status_new" USING ("status"::text::"payment_status_new");
ALTER TABLE "expense" ALTER COLUMN "payment_status" TYPE "payment_status_new" USING ("payment_status"::text::"payment_status_new");
ALTER TABLE "payable" ALTER COLUMN "status" TYPE "payment_status_new" USING ("status"::text::"payment_status_new");
ALTER TYPE "payment_status" RENAME TO "payment_status_old";
ALTER TYPE "payment_status_new" RENAME TO "payment_status";
DROP TYPE "payment_status_old";
ALTER TABLE "expense" ALTER COLUMN "payment_status" SET DEFAULT 'PENDING';
ALTER TABLE "payable" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "receivable" ALTER COLUMN "status" SET DEFAULT 'PENDING';
ALTER TABLE "revenue" ALTER COLUMN "payment_status" SET DEFAULT 'PENDING';
COMMIT;
