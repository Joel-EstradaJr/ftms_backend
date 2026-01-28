/*
  Warnings:

  - You are about to drop the column `approval_status` on the `revenue` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "revenue_approval_status_idx";

-- AlterTable
ALTER TABLE "revenue" DROP COLUMN "approval_status";

-- DropEnum
DROP TYPE "revenue_approval_status";
