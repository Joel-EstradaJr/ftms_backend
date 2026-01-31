-- CreateEnum
CREATE TYPE "revenue_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- AlterTable
ALTER TABLE "revenue" ADD COLUMN     "approval_remarks" TEXT,
ADD COLUMN     "status" "revenue_status" NOT NULL DEFAULT 'PENDING';
