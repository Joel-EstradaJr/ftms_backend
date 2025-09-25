/*
  Warnings:

  - You are about to drop the `ModuleCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ModuleItemUnit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ModulePaymentMethod` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ModulePaymentStatus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ModuleReimbursementStatus` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ModuleSource` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ModuleTerms` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ModuleCategory" DROP CONSTRAINT "ModuleCategory_category_id_fkey";

-- DropForeignKey
ALTER TABLE "ModuleItemUnit" DROP CONSTRAINT "ModuleItemUnit_unit_id_fkey";

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
ALTER TABLE "GlobalCategory" ADD COLUMN     "applicable_modules" TEXT[];

-- AlterTable
ALTER TABLE "GlobalItemUnit" ADD COLUMN     "applicable_modules" TEXT[];

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
DROP TABLE "ModuleItemUnit";

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
