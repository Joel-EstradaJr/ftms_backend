/*
  Warnings:

  - The values [PAID,OVERDUE,CANCELLED] on the enum `expense_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "expense_status_new" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');
ALTER TABLE "public"."expense" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "expense" ALTER COLUMN "status" TYPE "expense_status_new" USING ("status"::text::"expense_status_new");
ALTER TYPE "expense_status" RENAME TO "expense_status_old";
ALTER TYPE "expense_status_new" RENAME TO "expense_status";
DROP TYPE "public"."expense_status_old";
ALTER TABLE "expense" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "expense" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" TEXT;
