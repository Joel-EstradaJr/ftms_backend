/*
  Warnings:

  - You are about to drop the column `source_ref` on the `RevenueRecord` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `RevenueInstallment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERPAID', 'LATE');

-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'SEMI_MONTHLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "RevenueInstallment" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "RevenueRecord" DROP COLUMN "source_ref",
ADD COLUMN     "outstanding_balance" DECIMAL(20,4) NOT NULL DEFAULT 0,
ADD COLUMN     "principal_amount" DECIMAL(20,4) NOT NULL DEFAULT 0,
ADD COLUMN     "schedule_type" "ScheduleType" NOT NULL DEFAULT 'NONE';
