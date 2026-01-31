-- CreateEnum
CREATE TYPE "receivable_frequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "system_configuration" (
    "id" SERIAL NOT NULL,
    "config_code" TEXT NOT NULL,
    "minimum_wage" DECIMAL(12,2) NOT NULL DEFAULT 600.00,
    "duration_to_receivable_hours" INTEGER NOT NULL DEFAULT 72,
    "receivable_due_date_days" INTEGER NOT NULL DEFAULT 30,
    "driver_share_percentage" DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    "conductor_share_percentage" DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    "default_frequency" "receivable_frequency" NOT NULL DEFAULT 'WEEKLY',
    "default_number_of_payments" INTEGER NOT NULL DEFAULT 3,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "system_configuration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_configuration_config_code_key" ON "system_configuration"("config_code");

-- CreateIndex
CREATE INDEX "system_configuration_config_code_idx" ON "system_configuration"("config_code");

-- CreateIndex
CREATE INDEX "system_configuration_is_active_idx" ON "system_configuration"("is_active");
