/*
  Warnings:

  - The values [ONLINE] on the enum `payment_method` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "payment_method_new" AS ENUM ('CASH', 'BANK_TRANSFER', 'E_WALLET', 'REIMBURSEMENT');
ALTER TABLE "public"."expense" ALTER COLUMN "payment_method" DROP DEFAULT;
ALTER TABLE "public"."expense_installment_payment" ALTER COLUMN "payment_method" DROP DEFAULT;
ALTER TABLE "public"."revenue" ALTER COLUMN "payment_method" DROP DEFAULT;
ALTER TABLE "public"."revenue_installment_payment" ALTER COLUMN "payment_method" DROP DEFAULT;
ALTER TABLE "revenue" ALTER COLUMN "payment_method" TYPE "payment_method_new" USING ("payment_method"::text::"payment_method_new");
ALTER TABLE "revenue_installment_payment" ALTER COLUMN "payment_method" TYPE "payment_method_new" USING ("payment_method"::text::"payment_method_new");
ALTER TABLE "expense" ALTER COLUMN "payment_method" TYPE "payment_method_new" USING ("payment_method"::text::"payment_method_new");
ALTER TABLE "expense_installment_payment" ALTER COLUMN "payment_method" TYPE "payment_method_new" USING ("payment_method"::text::"payment_method_new");
ALTER TYPE "payment_method" RENAME TO "payment_method_old";
ALTER TYPE "payment_method_new" RENAME TO "payment_method";
DROP TYPE "public"."payment_method_old";
ALTER TABLE "expense" ALTER COLUMN "payment_method" SET DEFAULT 'CASH';
ALTER TABLE "expense_installment_payment" ALTER COLUMN "payment_method" SET DEFAULT 'CASH';
ALTER TABLE "revenue" ALTER COLUMN "payment_method" SET DEFAULT 'CASH';
ALTER TABLE "revenue_installment_payment" ALTER COLUMN "payment_method" SET DEFAULT 'CASH';
COMMIT;
