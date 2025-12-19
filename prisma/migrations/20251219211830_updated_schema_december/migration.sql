/*
  Warnings:

  - The values [INACTIVE] on the enum `asset_status` will be removed. If these variants are still used in the database, this will fail.
  - The values [PENDING] on the enum `journal_status` will be removed. If these variants are still used in the database, this will fail.
  - The values [OPEN,LOCKED,APPROVED,POSTED] on the enum `payroll_period_status` will be removed. If these variants are still used in the database, this will fail.
  - The values [APPROVED,POSTED] on the enum `payroll_status` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `cycle_month` on the `department_budget_cycle` table. All the data in the column will be lost.
  - You are about to drop the column `cycle_year` on the `department_budget_cycle` table. All the data in the column will be lost.
  - You are about to drop the column `refund_replacement_id` on the `expense_adjustment` table. All the data in the column will be lost.
  - You are about to drop the column `estimated_life_years` on the `fixed_asset` table. All the data in the column will be lost.
  - You are about to drop the `refund_replacement_finance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `refund_replacement_item_finance` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `start_date` to the `department_budget_cycle` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `disposal_type` on the `disposal_revenue` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `disposal_method` on the `disposal_revenue` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `location` to the `fixed_asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quantity` to the `fixed_asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `remarks` to the `fixed_asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit_code` to the `fixed_asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `useful_life` to the `fixed_asset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payroll_period_code` to the `payroll_period` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "disposal_type_enum" AS ENUM ('ITEM', 'BUS', 'FIXED_ASSET');

-- CreateEnum
CREATE TYPE "disposal_method_enum" AS ENUM ('FOR_SALE', 'SCRAPPED', 'DONATED', 'TRANSFERRED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "entry_type" AS ENUM ('AUTO_GENERATED', 'MANUAL');

-- CreateEnum
CREATE TYPE "budget_cycle_type" AS ENUM ('MONTHLY', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "budget_allocation_type" AS ENUM ('INCREASE', 'DECREASE', 'USAGE');

-- AlterEnum
BEGIN;
CREATE TYPE "asset_status_new" AS ENUM ('PENDING', 'ACTIVE', 'FULLY_DEPRECIATED', 'DISPOSED');
ALTER TABLE "fixed_asset" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "fixed_asset" ALTER COLUMN "status" TYPE "asset_status_new" USING ("status"::text::"asset_status_new");
ALTER TYPE "asset_status" RENAME TO "asset_status_old";
ALTER TYPE "asset_status_new" RENAME TO "asset_status";
DROP TYPE "asset_status_old";
ALTER TABLE "fixed_asset" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "journal_status_new" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED');
ALTER TABLE "journal_entry" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "journal_entry" ALTER COLUMN "status" TYPE "journal_status_new" USING ("status"::text::"journal_status_new");
ALTER TYPE "journal_status" RENAME TO "journal_status_old";
ALTER TYPE "journal_status_new" RENAME TO "journal_status";
DROP TYPE "journal_status_old";
ALTER TABLE "journal_entry" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "payroll_period_status_new" AS ENUM ('DRAFT', 'PARTIAL', 'RELEASED');
ALTER TABLE "payroll_period" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "payroll_period" ALTER COLUMN "status" TYPE "payroll_period_status_new" USING ("status"::text::"payroll_period_status_new");
ALTER TYPE "payroll_period_status" RENAME TO "payroll_period_status_old";
ALTER TYPE "payroll_period_status_new" RENAME TO "payroll_period_status";
DROP TYPE "payroll_period_status_old";
ALTER TABLE "payroll_period" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "payroll_status_new" AS ENUM ('PENDING', 'RELEASED');
ALTER TABLE "payroll" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "payroll" ALTER COLUMN "status" TYPE "payroll_status_new" USING ("status"::text::"payroll_status_new");
ALTER TYPE "payroll_status" RENAME TO "payroll_status_old";
ALTER TYPE "payroll_status_new" RENAME TO "payroll_status";
DROP TYPE "payroll_status_old";
ALTER TABLE "payroll" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "expense_adjustment" DROP CONSTRAINT "expense_adjustment_refund_replacement_id_fkey";

-- DropForeignKey
ALTER TABLE "refund_replacement_finance" DROP CONSTRAINT "refund_replacement_finance_expense_id_fkey";

-- DropForeignKey
ALTER TABLE "refund_replacement_item_finance" DROP CONSTRAINT "refund_replacement_item_finance_refund_replacement_id_fkey";

-- DropIndex
DROP INDEX "department_budget_cycle_budget_id_cycle_year_cycle_month_idx";

-- DropIndex
DROP INDEX "department_budget_cycle_cycle_year_cycle_month_idx";

-- DropIndex
DROP INDEX "expense_adjustment_refund_replacement_id_idx";

-- AlterTable
ALTER TABLE "department_budget_cycle" DROP COLUMN "cycle_month",
DROP COLUMN "cycle_year",
ADD COLUMN     "cycle_type" "budget_cycle_type" NOT NULL DEFAULT 'MONTHLY',
ADD COLUMN     "end_date" TIMESTAMP(3),
ADD COLUMN     "interval_count" INTEGER,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reserved_budget" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "start_date" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "direct_budget_allocation" ADD COLUMN     "budget_allocation_type" "budget_allocation_type" NOT NULL DEFAULT 'INCREASE';

-- AlterTable
ALTER TABLE "disposal_revenue" DROP COLUMN "disposal_type",
ADD COLUMN     "disposal_type" "disposal_type_enum" NOT NULL,
DROP COLUMN "disposal_method",
ADD COLUMN     "disposal_method" "disposal_method_enum" NOT NULL;

-- AlterTable
ALTER TABLE "expense_adjustment" DROP COLUMN "refund_replacement_id";

-- AlterTable
ALTER TABLE "fixed_asset" DROP COLUMN "estimated_life_years",
ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "quantity" DECIMAL(14,2) NOT NULL,
ADD COLUMN     "remarks" TEXT NOT NULL,
ADD COLUMN     "unit_code" TEXT NOT NULL,
ADD COLUMN     "useful_life" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "journal_entry" ADD COLUMN     "entry_type" "entry_type" NOT NULL DEFAULT 'AUTO_GENERATED',
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "payroll_period" ADD COLUMN     "payroll_period_code" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- DropTable
DROP TABLE "refund_replacement_finance";

-- DropTable
DROP TABLE "refund_replacement_item_finance";

-- DropEnum
DROP TYPE "refund_replacement_action";

-- DropEnum
DROP TYPE "refund_replacement_finance_status";

-- CreateIndex
CREATE INDEX "disposal_revenue_disposal_type_idx" ON "disposal_revenue"("disposal_type");

-- CreateIndex
CREATE INDEX "disposal_revenue_disposal_method_idx" ON "disposal_revenue"("disposal_method");
