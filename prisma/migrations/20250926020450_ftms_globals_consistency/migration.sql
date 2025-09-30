-- CreateTable
CREATE TABLE "GlobalInstallmentStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "GlobalInstallmentStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleInstallmentStatus" (
    "id" TEXT NOT NULL,
    "module_name" TEXT NOT NULL,
    "installment_status_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "ModuleInstallmentStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalScheduleType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "GlobalScheduleType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleScheduleType" (
    "id" TEXT NOT NULL,
    "module_name" TEXT NOT NULL,
    "schedule_type_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "ModuleScheduleType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalPayrollStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "GlobalPayrollStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModulePayrollStatus" (
    "id" TEXT NOT NULL,
    "module_name" TEXT NOT NULL,
    "payroll_status_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "ModulePayrollStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalFrequency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "GlobalFrequency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleFrequency" (
    "id" TEXT NOT NULL,
    "module_name" TEXT NOT NULL,
    "frequency_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "ModuleFrequency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalReimbursementStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "GlobalReimbursementStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleReimbursementStatus" (
    "id" TEXT NOT NULL,
    "module_name" TEXT NOT NULL,
    "reimbursement_status_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "ModuleReimbursementStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GlobalInstallmentStatus_name_key" ON "GlobalInstallmentStatus"("name");

-- CreateIndex
CREATE INDEX "ModuleInstallmentStatus_module_name_idx" ON "ModuleInstallmentStatus"("module_name");

-- CreateIndex
CREATE INDEX "ModuleInstallmentStatus_installment_status_id_idx" ON "ModuleInstallmentStatus"("installment_status_id");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleInstallmentStatus_module_name_installment_status_id_key" ON "ModuleInstallmentStatus"("module_name", "installment_status_id");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalScheduleType_name_key" ON "GlobalScheduleType"("name");

-- CreateIndex
CREATE INDEX "ModuleScheduleType_module_name_idx" ON "ModuleScheduleType"("module_name");

-- CreateIndex
CREATE INDEX "ModuleScheduleType_schedule_type_id_idx" ON "ModuleScheduleType"("schedule_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleScheduleType_module_name_schedule_type_id_key" ON "ModuleScheduleType"("module_name", "schedule_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalPayrollStatus_name_key" ON "GlobalPayrollStatus"("name");

-- CreateIndex
CREATE INDEX "ModulePayrollStatus_module_name_idx" ON "ModulePayrollStatus"("module_name");

-- CreateIndex
CREATE INDEX "ModulePayrollStatus_payroll_status_id_idx" ON "ModulePayrollStatus"("payroll_status_id");

-- CreateIndex
CREATE UNIQUE INDEX "ModulePayrollStatus_module_name_payroll_status_id_key" ON "ModulePayrollStatus"("module_name", "payroll_status_id");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalFrequency_name_key" ON "GlobalFrequency"("name");

-- CreateIndex
CREATE INDEX "ModuleFrequency_module_name_idx" ON "ModuleFrequency"("module_name");

-- CreateIndex
CREATE INDEX "ModuleFrequency_frequency_id_idx" ON "ModuleFrequency"("frequency_id");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleFrequency_module_name_frequency_id_key" ON "ModuleFrequency"("module_name", "frequency_id");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalReimbursementStatus_name_key" ON "GlobalReimbursementStatus"("name");

-- CreateIndex
CREATE INDEX "ModuleReimbursementStatus_module_name_idx" ON "ModuleReimbursementStatus"("module_name");

-- CreateIndex
CREATE INDEX "ModuleReimbursementStatus_reimbursement_status_id_idx" ON "ModuleReimbursementStatus"("reimbursement_status_id");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleReimbursementStatus_module_name_reimbursement_status__key" ON "ModuleReimbursementStatus"("module_name", "reimbursement_status_id");

-- AddForeignKey
ALTER TABLE "ModuleInstallmentStatus" ADD CONSTRAINT "ModuleInstallmentStatus_installment_status_id_fkey" FOREIGN KEY ("installment_status_id") REFERENCES "GlobalInstallmentStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleScheduleType" ADD CONSTRAINT "ModuleScheduleType_schedule_type_id_fkey" FOREIGN KEY ("schedule_type_id") REFERENCES "GlobalScheduleType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModulePayrollStatus" ADD CONSTRAINT "ModulePayrollStatus_payroll_status_id_fkey" FOREIGN KEY ("payroll_status_id") REFERENCES "GlobalPayrollStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleFrequency" ADD CONSTRAINT "ModuleFrequency_frequency_id_fkey" FOREIGN KEY ("frequency_id") REFERENCES "GlobalFrequency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleReimbursementStatus" ADD CONSTRAINT "ModuleReimbursementStatus_reimbursement_status_id_fkey" FOREIGN KEY ("reimbursement_status_id") REFERENCES "GlobalReimbursementStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;
