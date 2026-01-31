-- AlterTable
ALTER TABLE "expense" ADD COLUMN     "approval_remarks" TEXT,
ADD COLUMN     "deletion_remarks" TEXT,
ADD COLUMN     "rejected_at" TIMESTAMP(3),
ADD COLUMN     "rejected_by" TEXT,
ADD COLUMN     "rejection_remarks" TEXT;
