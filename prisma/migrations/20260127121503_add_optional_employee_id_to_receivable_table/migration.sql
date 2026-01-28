-- AlterTable
ALTER TABLE "receivable" ADD COLUMN     "employee_id" TEXT;

-- CreateIndex
CREATE INDEX "receivable_employee_id_idx" ON "receivable"("employee_id");

-- AddForeignKey
ALTER TABLE "receivable" ADD CONSTRAINT "receivable_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employee_local"("employee_number") ON DELETE SET NULL ON UPDATE CASCADE;
