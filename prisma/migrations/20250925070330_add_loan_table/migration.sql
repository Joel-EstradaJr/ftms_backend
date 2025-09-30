-- CreateEnum
CREATE TYPE "EmployeeType" AS ENUM ('driver', 'conductor');

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "revenue_id" TEXT NOT NULL,
    "employee_type" "EmployeeType" NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Loan_revenue_id_idx" ON "Loan"("revenue_id");

-- CreateIndex
CREATE UNIQUE INDEX "Loan_revenue_id_employee_type_key" ON "Loan"("revenue_id", "employee_type");
