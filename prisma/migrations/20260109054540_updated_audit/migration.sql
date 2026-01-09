-- CreateEnum
CREATE TYPE "normal_balance" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "journal_status" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "revenue_status" AS ENUM ('PENDING', 'RECORDED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "expense_status" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "receivable_status" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "payable_status" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "revenue_approval_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "expense_approval_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "installment_status" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "payroll_status" AS ENUM ('PENDING', 'RELEASED');

-- CreateEnum
CREATE TYPE "payroll_period_status" AS ENUM ('DRAFT', 'PARTIAL', 'RELEASED');

-- CreateEnum
CREATE TYPE "rate_type" AS ENUM ('MONTHLY', 'DAILY', 'WEEKLY', 'SEMI_MONTHLY');

-- CreateEnum
CREATE TYPE "budget_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "asset_status" AS ENUM ('PENDING', 'ACTIVE', 'FULLY_DEPRECIATED', 'DISPOSED');

-- CreateEnum
CREATE TYPE "accumulation_type" AS ENUM ('APPRECIATION', 'DEPRECIATION');

-- CreateEnum
CREATE TYPE "disposal_type_enum" AS ENUM ('ITEM', 'BUS', 'FIXED_ASSET');

-- CreateEnum
CREATE TYPE "disposal_method_enum" AS ENUM ('FOR_SALE', 'SCRAPPED', 'DONATED', 'TRANSFERRED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "purchase_request_approval_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ADJUSTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "pr_item_finance_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ADJUSTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "entry_type" AS ENUM ('AUTO_GENERATED', 'MANUAL');

-- CreateEnum
CREATE TYPE "budget_cycle_type" AS ENUM ('MONTHLY', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "budget_allocation_type" AS ENUM ('INCREASE', 'DECREASE', 'USAGE');

-- CreateTable
CREATE TABLE "employees_cache" (
    "employee_number" TEXT NOT NULL,
    "first_name" TEXT,
    "middle_name" TEXT,
    "last_name" TEXT,
    "suffix" TEXT,
    "phone_number" TEXT,
    "position_id" TEXT NOT NULL,
    "position_name" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "department_name" TEXT NOT NULL,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "employees_cache_pkey" PRIMARY KEY ("employee_number")
);

-- CreateTable
CREATE TABLE "operational_trip" (
    "assignment_id" TEXT NOT NULL,
    "bus_trip_id" TEXT NOT NULL,
    "date_assigned" TIMESTAMP(3),
    "bus_route" TEXT,
    "trip_fuel_expense" DECIMAL(14,2),
    "trip_revenue" DECIMAL(14,2),
    "assignment_type" TEXT,
    "assignment_value" DECIMAL(14,2),
    "payment_method" TEXT,
    "bus_plate_number" TEXT,
    "bus_type" TEXT,
    "body_builder" TEXT,
    "body_number" TEXT,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "operational_trip_pkey" PRIMARY KEY ("assignment_id","bus_trip_id")
);

-- CreateTable
CREATE TABLE "operational_trip_employee" (
    "id" SERIAL NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "bus_trip_id" TEXT NOT NULL,
    "employee_number" TEXT NOT NULL,
    "first_name" TEXT,
    "middle_name" TEXT,
    "last_name" TEXT,
    "suffix" TEXT,
    "phone_number" TEXT,
    "position_id" TEXT,
    "position_name" TEXT,
    "department_id" TEXT,
    "department_name" TEXT,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operational_trip_employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_trip" (
    "assignment_id" TEXT NOT NULL,
    "bus_plate_number" TEXT,
    "bus_type" TEXT,
    "body_builder" TEXT,
    "body_number" TEXT,
    "rental_status" TEXT,
    "rental_destination" TEXT,
    "rental_start_date" TIMESTAMP(3),
    "rental_end_date" TIMESTAMP(3),
    "total_rental_amount" DECIMAL(14,2),
    "down_payment_amount" DECIMAL(14,2),
    "balance_amount" DECIMAL(14,2),
    "down_payment_date" TIMESTAMP(3),
    "full_payment_date" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "rental_fuel_expense" DECIMAL(14,2),
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "rental_trip_pkey" PRIMARY KEY ("assignment_id")
);

-- CreateTable
CREATE TABLE "rental_trip_employee" (
    "id" SERIAL NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "employee_number" TEXT NOT NULL,
    "first_name" TEXT,
    "middle_name" TEXT,
    "last_name" TEXT,
    "suffix" TEXT,
    "phone_number" TEXT,
    "position_id" TEXT,
    "position_name" TEXT,
    "department_id" TEXT,
    "department_name" TEXT,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rental_trip_employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_cache" (
    "id" SERIAL NOT NULL,
    "payroll_period_start" TIMESTAMP(3) NOT NULL,
    "payroll_period_end" TIMESTAMP(3) NOT NULL,
    "employee_number" TEXT NOT NULL,
    "employee_position_name" TEXT,
    "employee_department_name" TEXT,
    "basic_rate" DECIMAL(12,2),
    "rate_type" "rate_type" NOT NULL DEFAULT 'MONTHLY',
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "payroll_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_attendance_cache" (
    "id" SERIAL NOT NULL,
    "payroll_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_attendance_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_benefit_type_cache" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_benefit_type_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_benefit_cache" (
    "id" SERIAL NOT NULL,
    "payroll_id" INTEGER NOT NULL,
    "benefit_type_id" TEXT NOT NULL,
    "value" DECIMAL(12,2),
    "frequency" TEXT,
    "effective_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "is_active" BOOLEAN DEFAULT false,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_benefit_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_deduction_type_cache" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_deduction_type_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_deduction_cache" (
    "id" SERIAL NOT NULL,
    "payroll_id" INTEGER NOT NULL,
    "deduction_type_id" TEXT NOT NULL,
    "value" DECIMAL(12,2),
    "frequency" TEXT,
    "effective_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "is_active" BOOLEAN DEFAULT false,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_deduction_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_type" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "account_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chart_of_account" (
    "id" SERIAL NOT NULL,
    "account_code" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "account_type_id" INTEGER NOT NULL,
    "normal_balance" "normal_balance" NOT NULL,
    "description" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "chart_of_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entry" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "description" TEXT,
    "total_debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "journal_status" NOT NULL DEFAULT 'DRAFT',
    "entry_type" "entry_type" NOT NULL DEFAULT 'AUTO_GENERATED',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "reversal_of_id" INTEGER,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "journal_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entry_line" (
    "id" SERIAL NOT NULL,
    "journal_entry_id" INTEGER NOT NULL,
    "account_id" INTEGER NOT NULL,
    "debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "description" TEXT,
    "line_number" INTEGER,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "journal_entry_line_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_type" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "revenue_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "revenue_type_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date_recorded" TIMESTAMP(3),
    "date_expected" TIMESTAMP(3),
    "description" TEXT,
    "status" "revenue_status" NOT NULL DEFAULT 'RECORDED',
    "approval_status" "revenue_approval_status" NOT NULL DEFAULT 'PENDING',
    "operational_trip_assignment_id" TEXT,
    "operational_trip_bus_trip_id" TEXT,
    "rental_trip_assignment_id" TEXT,
    "receivable_id" INTEGER,
    "payment_method" TEXT,
    "payment_reference" TEXT,
    "journal_entry_id" INTEGER,
    "disposal_ref" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "revenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receivable" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "debtor_name" TEXT NOT NULL,
    "description" TEXT,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "due_date" TIMESTAMP(3),
    "status" "receivable_status" NOT NULL DEFAULT 'PENDING',
    "installment_plan" TEXT,
    "expected_installment" DECIMAL(12,2),
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "last_payment_date" TIMESTAMP(3),
    "last_payment_amount" DECIMAL(12,2),
    "interest_rate" DECIMAL(5,2),
    "accrued_interest" DECIMAL(12,2) DEFAULT 0,
    "last_interest_applied" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "receivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_installment_schedule" (
    "id" SERIAL NOT NULL,
    "receivable_id" INTEGER NOT NULL,
    "installment_number" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "amount_due" DECIMAL(12,2) NOT NULL,
    "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(12,2) NOT NULL,
    "status" "installment_status" NOT NULL DEFAULT 'PENDING',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "revenue_installment_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_installment_payment" (
    "id" SERIAL NOT NULL,
    "installment_id" INTEGER NOT NULL,
    "revenue_id" INTEGER NOT NULL,
    "amount_paid" DECIMAL(12,2) NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_method" TEXT,
    "payment_reference" TEXT,
    "journal_entry_id" INTEGER,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "revenue_installment_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_type" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "expense_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "expense_type_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date_recorded" TIMESTAMP(3),
    "date_expected" TIMESTAMP(3),
    "description" TEXT,
    "status" "expense_status" NOT NULL DEFAULT 'PENDING',
    "approval_status" "expense_approval_status" NOT NULL DEFAULT 'PENDING',
    "operational_trip_assignment_id" TEXT,
    "operational_trip_bus_trip_id" TEXT,
    "rental_trip_assignment_id" TEXT,
    "payable_id" INTEGER,
    "payment_method" TEXT,
    "payment_reference" TEXT,
    "journal_entry_id" INTEGER,
    "order_ref" TEXT,
    "purchase_request_ref" TEXT,
    "original_amount" DECIMAL(12,2),
    "adjusted_amount" DECIMAL(12,2),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payable" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "creditor_name" TEXT NOT NULL,
    "description" TEXT,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "due_date" TIMESTAMP(3),
    "status" "payable_status" NOT NULL DEFAULT 'PENDING',
    "installment_plan" TEXT,
    "expected_installment" DECIMAL(12,2),
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "last_payment_date" TIMESTAMP(3),
    "last_payment_amount" DECIMAL(12,2),
    "interest_rate" DECIMAL(5,2),
    "accrued_interest" DECIMAL(12,2) DEFAULT 0,
    "last_interest_applied" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "payable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_installment_schedule" (
    "id" SERIAL NOT NULL,
    "payable_id" INTEGER NOT NULL,
    "installment_number" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "amount_due" DECIMAL(12,2) NOT NULL,
    "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(12,2) NOT NULL,
    "status" "installment_status" NOT NULL DEFAULT 'PENDING',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "expense_installment_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_installment_payment" (
    "id" SERIAL NOT NULL,
    "installment_id" INTEGER NOT NULL,
    "expense_id" INTEGER NOT NULL,
    "amount_paid" DECIMAL(12,2) NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_method" TEXT,
    "payment_reference" TEXT,
    "journal_entry_id" INTEGER,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "expense_installment_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_period" (
    "id" SERIAL NOT NULL,
    "payroll_period_code" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "status" "payroll_period_status" NOT NULL DEFAULT 'DRAFT',
    "total_employees" INTEGER,
    "total_gross" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_net" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "payroll_period_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll" (
    "id" SERIAL NOT NULL,
    "payroll_period_id" INTEGER NOT NULL,
    "employee_number" TEXT NOT NULL,
    "rate_type" "rate_type" NOT NULL DEFAULT 'MONTHLY',
    "basic_rate" DECIMAL(12,2),
    "gross_pay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_pay" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "payroll_status" NOT NULL DEFAULT 'PENDING',
    "expense_id" INTEGER,
    "journal_entry_id" INTEGER,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_item_type" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "payroll_item_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_item" (
    "id" SERIAL NOT NULL,
    "payroll_id" INTEGER NOT NULL,
    "item_type_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "quantity" DECIMAL(12,2),
    "rate" DECIMAL(12,2),
    "description" TEXT,
    "category" TEXT NOT NULL,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "payroll_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_attendance" (
    "id" SERIAL NOT NULL,
    "payroll_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "hours_worked" DECIMAL(5,2),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "payroll_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department_budget" (
    "id" SERIAL NOT NULL,
    "department_id" TEXT NOT NULL,
    "department_name" TEXT,
    "total_budget" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "used_budget" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "remaining_budget" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "budget_status" NOT NULL DEFAULT 'ACTIVE',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "department_budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "department_budget_cycle" (
    "id" SERIAL NOT NULL,
    "budget_id" INTEGER NOT NULL,
    "cycle_type" "budget_cycle_type" NOT NULL DEFAULT 'MONTHLY',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "interval_count" INTEGER,
    "starting_budget" DECIMAL(14,2) NOT NULL,
    "used_budget" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "remaining_budget" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "carry_over_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "reserved_budget" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "department_budget_cycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approved_budget_request" (
    "id" SERIAL NOT NULL,
    "budget_id" INTEGER NOT NULL,
    "request_code" TEXT NOT NULL,
    "approved_amount" DECIMAL(14,2) NOT NULL,
    "approval_date" TIMESTAMP(3) NOT NULL,
    "approved_by" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "approved_budget_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_budget_allocation" (
    "id" SERIAL NOT NULL,
    "budget_id" INTEGER NOT NULL,
    "allocated_amount" DECIMAL(14,2) NOT NULL,
    "allocation_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "allocated_by" TEXT,
    "budget_allocation_type" "budget_allocation_type" NOT NULL DEFAULT 'INCREASE',
    "description" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "direct_budget_allocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_usage" (
    "id" SERIAL NOT NULL,
    "budget_id" INTEGER NOT NULL,
    "order_ref" TEXT,
    "expense_id" INTEGER,
    "consumed_amount" DECIMAL(14,2) NOT NULL,
    "consumption_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "original_consumed_amount" DECIMAL(14,2),
    "refund_adjustment" DECIMAL(14,2) DEFAULT 0,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "budget_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_request_approval" (
    "id" SERIAL NOT NULL,
    "request_code" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "department_name" TEXT,
    "category_id" INTEGER NOT NULL,
    "request_type" TEXT NOT NULL,
    "reason" TEXT,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "status" "purchase_request_approval_status" NOT NULL DEFAULT 'PENDING',
    "budget_request_code" TEXT,
    "department_budget_id" INTEGER,
    "approved_amount" DECIMAL(12,2),
    "finance_remarks" TEXT,
    "order_code" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "rejected_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "purchase_request_approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_request_item_finance" (
    "id" SERIAL NOT NULL,
    "purchase_request_id" INTEGER NOT NULL,
    "pr_item_ref_from_inv" TEXT NOT NULL,
    "external_item_ref" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "requested_quantity" DECIMAL(12,2) NOT NULL,
    "requested_unit_price" DECIMAL(12,2) NOT NULL,
    "requested_total" DECIMAL(12,2) NOT NULL,
    "status" "pr_item_finance_status" NOT NULL DEFAULT 'PENDING',
    "approved_quantity" DECIMAL(12,2),
    "approved_unit_price" DECIMAL(12,2),
    "approved_total" DECIMAL(12,2),
    "supplier_id" TEXT,
    "supplier_name" TEXT,
    "supplier_item_ref" TEXT,
    "finance_notes" TEXT,
    "rejection_reason" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "purchase_request_item_finance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disposal_revenue" (
    "id" SERIAL NOT NULL,
    "disposal_ref" TEXT NOT NULL,
    "revenue_id" INTEGER,
    "disposal_type" "disposal_type_enum" NOT NULL,
    "disposal_method" "disposal_method_enum" NOT NULL,
    "item_ref" TEXT,
    "item_name" TEXT,
    "quantity" DECIMAL(12,2),
    "book_value" DECIMAL(14,2),
    "disposal_value" DECIMAL(14,2) NOT NULL,
    "gain_loss" DECIMAL(14,2),
    "fixed_asset_id" INTEGER,
    "is_revenue_recorded" BOOLEAN NOT NULL DEFAULT false,
    "is_asset_updated" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "disposal_revenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_adjustment" (
    "id" SERIAL NOT NULL,
    "expense_id" INTEGER NOT NULL,
    "adjustment_code" TEXT NOT NULL,
    "adjustment_type" TEXT NOT NULL,
    "original_amount" DECIMAL(12,2) NOT NULL,
    "adjustment_amount" DECIMAL(12,2) NOT NULL,
    "new_amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "journal_entry_id" INTEGER,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "expense_adjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_type" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "asset_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_asset" (
    "id" SERIAL NOT NULL,
    "asset_code" TEXT NOT NULL,
    "asset_type_id" INTEGER NOT NULL,
    "inventory_item_ref" TEXT,
    "asset_name" TEXT NOT NULL,
    "acquisition_date" TIMESTAMP(3) NOT NULL,
    "acquisition_cost" DECIMAL(14,2) NOT NULL,
    "useful_life" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "unit_code" TEXT NOT NULL,
    "quantity" DECIMAL(14,2) NOT NULL,
    "status" "asset_status" NOT NULL DEFAULT 'ACTIVE',
    "remarks" TEXT,
    "disposal_ref" TEXT,
    "disposal_date" TIMESTAMP(3),
    "disposal_value" DECIMAL(14,2),
    "disposal_gain_loss" DECIMAL(14,2),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "fixed_asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_accumulation" (
    "id" SERIAL NOT NULL,
    "fixed_asset_id" INTEGER NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "monthly_amount" DECIMAL(14,2) NOT NULL,
    "accumulated_amount" DECIMAL(14,2) NOT NULL,
    "accumulation_type" "accumulation_type" NOT NULL DEFAULT 'DEPRECIATION',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3),
    "archived_by" TEXT,
    "archived_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "asset_accumulation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employees_cache_is_deleted_idx" ON "employees_cache"("is_deleted");

-- CreateIndex
CREATE INDEX "employees_cache_last_synced_at_idx" ON "employees_cache"("last_synced_at");

-- CreateIndex
CREATE INDEX "employees_cache_department_id_idx" ON "employees_cache"("department_id");

-- CreateIndex
CREATE INDEX "operational_trip_date_assigned_idx" ON "operational_trip"("date_assigned");

-- CreateIndex
CREATE INDEX "operational_trip_bus_route_idx" ON "operational_trip"("bus_route");

-- CreateIndex
CREATE INDEX "operational_trip_assignment_type_idx" ON "operational_trip"("assignment_type");

-- CreateIndex
CREATE INDEX "operational_trip_is_deleted_idx" ON "operational_trip"("is_deleted");

-- CreateIndex
CREATE INDEX "operational_trip_last_synced_at_idx" ON "operational_trip"("last_synced_at");

-- CreateIndex
CREATE INDEX "operational_trip_employee_employee_number_idx" ON "operational_trip_employee"("employee_number");

-- CreateIndex
CREATE INDEX "operational_trip_employee_assignment_id_bus_trip_id_idx" ON "operational_trip_employee"("assignment_id", "bus_trip_id");

-- CreateIndex
CREATE INDEX "operational_trip_employee_position_name_idx" ON "operational_trip_employee"("position_name");

-- CreateIndex
CREATE INDEX "operational_trip_employee_department_name_idx" ON "operational_trip_employee"("department_name");

-- CreateIndex
CREATE INDEX "rental_trip_rental_status_idx" ON "rental_trip"("rental_status");

-- CreateIndex
CREATE INDEX "rental_trip_rental_start_date_idx" ON "rental_trip"("rental_start_date");

-- CreateIndex
CREATE INDEX "rental_trip_rental_end_date_idx" ON "rental_trip"("rental_end_date");

-- CreateIndex
CREATE INDEX "rental_trip_is_deleted_idx" ON "rental_trip"("is_deleted");

-- CreateIndex
CREATE INDEX "rental_trip_last_synced_at_idx" ON "rental_trip"("last_synced_at");

-- CreateIndex
CREATE INDEX "rental_trip_employee_employee_number_idx" ON "rental_trip_employee"("employee_number");

-- CreateIndex
CREATE INDEX "rental_trip_employee_assignment_id_idx" ON "rental_trip_employee"("assignment_id");

-- CreateIndex
CREATE INDEX "rental_trip_employee_position_name_idx" ON "rental_trip_employee"("position_name");

-- CreateIndex
CREATE INDEX "rental_trip_employee_department_name_idx" ON "rental_trip_employee"("department_name");

-- CreateIndex
CREATE INDEX "payroll_cache_employee_number_idx" ON "payroll_cache"("employee_number");

-- CreateIndex
CREATE INDEX "payroll_cache_payroll_period_start_idx" ON "payroll_cache"("payroll_period_start");

-- CreateIndex
CREATE INDEX "payroll_cache_payroll_period_end_idx" ON "payroll_cache"("payroll_period_end");

-- CreateIndex
CREATE INDEX "payroll_cache_is_deleted_idx" ON "payroll_cache"("is_deleted");

-- CreateIndex
CREATE INDEX "payroll_cache_payroll_period_start_payroll_period_end_idx" ON "payroll_cache"("payroll_period_start", "payroll_period_end");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_cache_employee_number_payroll_period_start_payroll__key" ON "payroll_cache"("employee_number", "payroll_period_start", "payroll_period_end");

-- CreateIndex
CREATE INDEX "payroll_attendance_cache_payroll_id_idx" ON "payroll_attendance_cache"("payroll_id");

-- CreateIndex
CREATE INDEX "payroll_attendance_cache_date_idx" ON "payroll_attendance_cache"("date");

-- CreateIndex
CREATE INDEX "payroll_attendance_cache_status_idx" ON "payroll_attendance_cache"("status");

-- CreateIndex
CREATE INDEX "payroll_benefit_type_cache_name_idx" ON "payroll_benefit_type_cache"("name");

-- CreateIndex
CREATE INDEX "payroll_benefit_cache_payroll_id_idx" ON "payroll_benefit_cache"("payroll_id");

-- CreateIndex
CREATE INDEX "payroll_benefit_cache_benefit_type_id_idx" ON "payroll_benefit_cache"("benefit_type_id");

-- CreateIndex
CREATE INDEX "payroll_benefit_cache_is_active_idx" ON "payroll_benefit_cache"("is_active");

-- CreateIndex
CREATE INDEX "payroll_deduction_type_cache_name_idx" ON "payroll_deduction_type_cache"("name");

-- CreateIndex
CREATE INDEX "payroll_deduction_cache_payroll_id_idx" ON "payroll_deduction_cache"("payroll_id");

-- CreateIndex
CREATE INDEX "payroll_deduction_cache_deduction_type_id_idx" ON "payroll_deduction_cache"("deduction_type_id");

-- CreateIndex
CREATE INDEX "payroll_deduction_cache_is_active_idx" ON "payroll_deduction_cache"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "account_type_code_key" ON "account_type"("code");

-- CreateIndex
CREATE UNIQUE INDEX "account_type_name_key" ON "account_type"("name");

-- CreateIndex
CREATE INDEX "account_type_code_idx" ON "account_type"("code");

-- CreateIndex
CREATE INDEX "account_type_name_idx" ON "account_type"("name");

-- CreateIndex
CREATE INDEX "account_type_is_deleted_idx" ON "account_type"("is_deleted");

-- CreateIndex
CREATE INDEX "account_type_created_at_idx" ON "account_type"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_account_account_code_key" ON "chart_of_account"("account_code");

-- CreateIndex
CREATE INDEX "chart_of_account_account_type_id_idx" ON "chart_of_account"("account_type_id");

-- CreateIndex
CREATE INDEX "chart_of_account_account_code_idx" ON "chart_of_account"("account_code");

-- CreateIndex
CREATE INDEX "chart_of_account_account_name_idx" ON "chart_of_account"("account_name");

-- CreateIndex
CREATE INDEX "chart_of_account_normal_balance_idx" ON "chart_of_account"("normal_balance");

-- CreateIndex
CREATE INDEX "chart_of_account_is_deleted_idx" ON "chart_of_account"("is_deleted");

-- CreateIndex
CREATE INDEX "chart_of_account_created_at_idx" ON "chart_of_account"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_account_account_type_id_account_name_key" ON "chart_of_account"("account_type_id", "account_name");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entry_code_key" ON "journal_entry"("code");

-- CreateIndex
CREATE INDEX "journal_entry_code_idx" ON "journal_entry"("code");

-- CreateIndex
CREATE INDEX "journal_entry_date_idx" ON "journal_entry"("date");

-- CreateIndex
CREATE INDEX "journal_entry_status_idx" ON "journal_entry"("status");

-- CreateIndex
CREATE INDEX "journal_entry_approved_at_idx" ON "journal_entry"("approved_at");

-- CreateIndex
CREATE INDEX "journal_entry_is_deleted_idx" ON "journal_entry"("is_deleted");

-- CreateIndex
CREATE INDEX "journal_entry_created_at_idx" ON "journal_entry"("created_at");

-- CreateIndex
CREATE INDEX "journal_entry_line_journal_entry_id_idx" ON "journal_entry_line"("journal_entry_id");

-- CreateIndex
CREATE INDEX "journal_entry_line_account_id_idx" ON "journal_entry_line"("account_id");

-- CreateIndex
CREATE INDEX "journal_entry_line_is_deleted_idx" ON "journal_entry_line"("is_deleted");

-- CreateIndex
CREATE INDEX "journal_entry_line_created_at_idx" ON "journal_entry_line"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_type_code_key" ON "revenue_type"("code");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_type_name_key" ON "revenue_type"("name");

-- CreateIndex
CREATE INDEX "revenue_type_code_idx" ON "revenue_type"("code");

-- CreateIndex
CREATE INDEX "revenue_type_name_idx" ON "revenue_type"("name");

-- CreateIndex
CREATE INDEX "revenue_type_is_deleted_idx" ON "revenue_type"("is_deleted");

-- CreateIndex
CREATE INDEX "revenue_type_created_at_idx" ON "revenue_type"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_code_key" ON "revenue"("code");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_journal_entry_id_key" ON "revenue"("journal_entry_id");

-- CreateIndex
CREATE INDEX "revenue_code_idx" ON "revenue"("code");

-- CreateIndex
CREATE INDEX "revenue_revenue_type_id_idx" ON "revenue"("revenue_type_id");

-- CreateIndex
CREATE INDEX "revenue_date_recorded_idx" ON "revenue"("date_recorded");

-- CreateIndex
CREATE INDEX "revenue_date_expected_idx" ON "revenue"("date_expected");

-- CreateIndex
CREATE INDEX "revenue_status_idx" ON "revenue"("status");

-- CreateIndex
CREATE INDEX "revenue_approval_status_idx" ON "revenue"("approval_status");

-- CreateIndex
CREATE INDEX "revenue_approval_status_operational_trip_assignment_id_oper_idx" ON "revenue"("approval_status", "operational_trip_assignment_id", "operational_trip_bus_trip_id");

-- CreateIndex
CREATE INDEX "revenue_payment_method_idx" ON "revenue"("payment_method");

-- CreateIndex
CREATE INDEX "revenue_receivable_id_idx" ON "revenue"("receivable_id");

-- CreateIndex
CREATE INDEX "revenue_rental_trip_assignment_id_idx" ON "revenue"("rental_trip_assignment_id");

-- CreateIndex
CREATE INDEX "revenue_disposal_ref_idx" ON "revenue"("disposal_ref");

-- CreateIndex
CREATE INDEX "revenue_journal_entry_id_idx" ON "revenue"("journal_entry_id");

-- CreateIndex
CREATE INDEX "revenue_is_deleted_idx" ON "revenue"("is_deleted");

-- CreateIndex
CREATE INDEX "revenue_created_at_idx" ON "revenue"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "receivable_code_key" ON "receivable"("code");

-- CreateIndex
CREATE INDEX "receivable_code_idx" ON "receivable"("code");

-- CreateIndex
CREATE INDEX "receivable_debtor_name_idx" ON "receivable"("debtor_name");

-- CreateIndex
CREATE INDEX "receivable_due_date_idx" ON "receivable"("due_date");

-- CreateIndex
CREATE INDEX "receivable_status_idx" ON "receivable"("status");

-- CreateIndex
CREATE INDEX "receivable_is_deleted_idx" ON "receivable"("is_deleted");

-- CreateIndex
CREATE INDEX "receivable_created_at_idx" ON "receivable"("created_at");

-- CreateIndex
CREATE INDEX "revenue_installment_schedule_receivable_id_idx" ON "revenue_installment_schedule"("receivable_id");

-- CreateIndex
CREATE INDEX "revenue_installment_schedule_due_date_idx" ON "revenue_installment_schedule"("due_date");

-- CreateIndex
CREATE INDEX "revenue_installment_schedule_status_idx" ON "revenue_installment_schedule"("status");

-- CreateIndex
CREATE INDEX "revenue_installment_schedule_created_at_idx" ON "revenue_installment_schedule"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_installment_schedule_receivable_id_installment_numb_key" ON "revenue_installment_schedule"("receivable_id", "installment_number");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_installment_payment_journal_entry_id_key" ON "revenue_installment_payment"("journal_entry_id");

-- CreateIndex
CREATE INDEX "revenue_installment_payment_installment_id_idx" ON "revenue_installment_payment"("installment_id");

-- CreateIndex
CREATE INDEX "revenue_installment_payment_revenue_id_idx" ON "revenue_installment_payment"("revenue_id");

-- CreateIndex
CREATE INDEX "revenue_installment_payment_payment_date_idx" ON "revenue_installment_payment"("payment_date");

-- CreateIndex
CREATE INDEX "revenue_installment_payment_installment_id_payment_date_idx" ON "revenue_installment_payment"("installment_id", "payment_date");

-- CreateIndex
CREATE UNIQUE INDEX "expense_type_code_key" ON "expense_type"("code");

-- CreateIndex
CREATE UNIQUE INDEX "expense_type_name_key" ON "expense_type"("name");

-- CreateIndex
CREATE INDEX "expense_type_code_idx" ON "expense_type"("code");

-- CreateIndex
CREATE INDEX "expense_type_name_idx" ON "expense_type"("name");

-- CreateIndex
CREATE INDEX "expense_type_is_deleted_idx" ON "expense_type"("is_deleted");

-- CreateIndex
CREATE INDEX "expense_type_created_at_idx" ON "expense_type"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "expense_code_key" ON "expense"("code");

-- CreateIndex
CREATE INDEX "expense_code_idx" ON "expense"("code");

-- CreateIndex
CREATE INDEX "expense_expense_type_id_idx" ON "expense"("expense_type_id");

-- CreateIndex
CREATE INDEX "expense_date_recorded_idx" ON "expense"("date_recorded");

-- CreateIndex
CREATE INDEX "expense_date_expected_idx" ON "expense"("date_expected");

-- CreateIndex
CREATE INDEX "expense_status_idx" ON "expense"("status");

-- CreateIndex
CREATE INDEX "expense_approval_status_idx" ON "expense"("approval_status");

-- CreateIndex
CREATE INDEX "expense_approval_status_operational_trip_assignment_id_oper_idx" ON "expense"("approval_status", "operational_trip_assignment_id", "operational_trip_bus_trip_id");

-- CreateIndex
CREATE INDEX "expense_payment_method_idx" ON "expense"("payment_method");

-- CreateIndex
CREATE INDEX "expense_payable_id_idx" ON "expense"("payable_id");

-- CreateIndex
CREATE INDEX "expense_order_ref_idx" ON "expense"("order_ref");

-- CreateIndex
CREATE INDEX "expense_purchase_request_ref_idx" ON "expense"("purchase_request_ref");

-- CreateIndex
CREATE INDEX "expense_rental_trip_assignment_id_idx" ON "expense"("rental_trip_assignment_id");

-- CreateIndex
CREATE INDEX "expense_journal_entry_id_idx" ON "expense"("journal_entry_id");

-- CreateIndex
CREATE INDEX "expense_is_deleted_idx" ON "expense"("is_deleted");

-- CreateIndex
CREATE INDEX "expense_created_at_idx" ON "expense"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payable_code_key" ON "payable"("code");

-- CreateIndex
CREATE INDEX "payable_code_idx" ON "payable"("code");

-- CreateIndex
CREATE INDEX "payable_creditor_name_idx" ON "payable"("creditor_name");

-- CreateIndex
CREATE INDEX "payable_due_date_idx" ON "payable"("due_date");

-- CreateIndex
CREATE INDEX "payable_status_idx" ON "payable"("status");

-- CreateIndex
CREATE INDEX "payable_is_deleted_idx" ON "payable"("is_deleted");

-- CreateIndex
CREATE INDEX "payable_created_at_idx" ON "payable"("created_at");

-- CreateIndex
CREATE INDEX "expense_installment_schedule_payable_id_idx" ON "expense_installment_schedule"("payable_id");

-- CreateIndex
CREATE INDEX "expense_installment_schedule_due_date_idx" ON "expense_installment_schedule"("due_date");

-- CreateIndex
CREATE INDEX "expense_installment_schedule_status_idx" ON "expense_installment_schedule"("status");

-- CreateIndex
CREATE INDEX "expense_installment_schedule_created_at_idx" ON "expense_installment_schedule"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "expense_installment_schedule_payable_id_installment_number_key" ON "expense_installment_schedule"("payable_id", "installment_number");

-- CreateIndex
CREATE INDEX "expense_installment_payment_installment_id_idx" ON "expense_installment_payment"("installment_id");

-- CreateIndex
CREATE INDEX "expense_installment_payment_expense_id_idx" ON "expense_installment_payment"("expense_id");

-- CreateIndex
CREATE INDEX "expense_installment_payment_payment_date_idx" ON "expense_installment_payment"("payment_date");

-- CreateIndex
CREATE INDEX "expense_installment_payment_installment_id_payment_date_idx" ON "expense_installment_payment"("installment_id", "payment_date");

-- CreateIndex
CREATE INDEX "payroll_period_period_start_idx" ON "payroll_period"("period_start");

-- CreateIndex
CREATE INDEX "payroll_period_period_end_idx" ON "payroll_period"("period_end");

-- CreateIndex
CREATE INDEX "payroll_period_status_idx" ON "payroll_period"("status");

-- CreateIndex
CREATE INDEX "payroll_period_is_deleted_idx" ON "payroll_period"("is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_journal_entry_id_key" ON "payroll"("journal_entry_id");

-- CreateIndex
CREATE INDEX "payroll_payroll_period_id_idx" ON "payroll"("payroll_period_id");

-- CreateIndex
CREATE INDEX "payroll_employee_number_idx" ON "payroll"("employee_number");

-- CreateIndex
CREATE INDEX "payroll_status_idx" ON "payroll"("status");

-- CreateIndex
CREATE INDEX "payroll_expense_id_idx" ON "payroll"("expense_id");

-- CreateIndex
CREATE INDEX "payroll_journal_entry_id_idx" ON "payroll"("journal_entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_item_type_code_key" ON "payroll_item_type"("code");

-- CreateIndex
CREATE INDEX "payroll_item_type_code_idx" ON "payroll_item_type"("code");

-- CreateIndex
CREATE INDEX "payroll_item_type_category_idx" ON "payroll_item_type"("category");

-- CreateIndex
CREATE INDEX "payroll_item_type_is_deleted_idx" ON "payroll_item_type"("is_deleted");

-- CreateIndex
CREATE INDEX "payroll_item_payroll_id_idx" ON "payroll_item"("payroll_id");

-- CreateIndex
CREATE INDEX "payroll_item_item_type_id_idx" ON "payroll_item"("item_type_id");

-- CreateIndex
CREATE INDEX "payroll_item_category_idx" ON "payroll_item"("category");

-- CreateIndex
CREATE INDEX "payroll_attendance_payroll_id_idx" ON "payroll_attendance"("payroll_id");

-- CreateIndex
CREATE INDEX "payroll_attendance_date_idx" ON "payroll_attendance"("date");

-- CreateIndex
CREATE INDEX "payroll_attendance_status_idx" ON "payroll_attendance"("status");

-- CreateIndex
CREATE UNIQUE INDEX "department_budget_department_id_key" ON "department_budget"("department_id");

-- CreateIndex
CREATE INDEX "department_budget_department_id_idx" ON "department_budget"("department_id");

-- CreateIndex
CREATE INDEX "department_budget_status_idx" ON "department_budget"("status");

-- CreateIndex
CREATE INDEX "department_budget_is_deleted_idx" ON "department_budget"("is_deleted");

-- CreateIndex
CREATE INDEX "department_budget_created_at_idx" ON "department_budget"("created_at");

-- CreateIndex
CREATE INDEX "department_budget_cycle_budget_id_idx" ON "department_budget_cycle"("budget_id");

-- CreateIndex
CREATE UNIQUE INDEX "approved_budget_request_request_code_key" ON "approved_budget_request"("request_code");

-- CreateIndex
CREATE INDEX "approved_budget_request_budget_id_idx" ON "approved_budget_request"("budget_id");

-- CreateIndex
CREATE INDEX "approved_budget_request_request_code_idx" ON "approved_budget_request"("request_code");

-- CreateIndex
CREATE INDEX "approved_budget_request_approval_date_idx" ON "approved_budget_request"("approval_date");

-- CreateIndex
CREATE INDEX "approved_budget_request_is_deleted_idx" ON "approved_budget_request"("is_deleted");

-- CreateIndex
CREATE INDEX "approved_budget_request_created_at_idx" ON "approved_budget_request"("created_at");

-- CreateIndex
CREATE INDEX "direct_budget_allocation_budget_id_idx" ON "direct_budget_allocation"("budget_id");

-- CreateIndex
CREATE INDEX "direct_budget_allocation_allocation_date_idx" ON "direct_budget_allocation"("allocation_date");

-- CreateIndex
CREATE INDEX "direct_budget_allocation_is_deleted_idx" ON "direct_budget_allocation"("is_deleted");

-- CreateIndex
CREATE INDEX "direct_budget_allocation_created_at_idx" ON "direct_budget_allocation"("created_at");

-- CreateIndex
CREATE INDEX "budget_usage_budget_id_idx" ON "budget_usage"("budget_id");

-- CreateIndex
CREATE INDEX "budget_usage_order_ref_idx" ON "budget_usage"("order_ref");

-- CreateIndex
CREATE INDEX "budget_usage_expense_id_idx" ON "budget_usage"("expense_id");

-- CreateIndex
CREATE INDEX "budget_usage_consumption_date_idx" ON "budget_usage"("consumption_date");

-- CreateIndex
CREATE INDEX "budget_usage_is_deleted_idx" ON "budget_usage"("is_deleted");

-- CreateIndex
CREATE INDEX "budget_usage_created_at_idx" ON "budget_usage"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_request_approval_request_code_key" ON "purchase_request_approval"("request_code");

-- CreateIndex
CREATE INDEX "purchase_request_approval_request_code_idx" ON "purchase_request_approval"("request_code");

-- CreateIndex
CREATE INDEX "purchase_request_approval_department_id_idx" ON "purchase_request_approval"("department_id");

-- CreateIndex
CREATE INDEX "purchase_request_approval_status_idx" ON "purchase_request_approval"("status");

-- CreateIndex
CREATE INDEX "purchase_request_approval_budget_request_code_idx" ON "purchase_request_approval"("budget_request_code");

-- CreateIndex
CREATE INDEX "purchase_request_approval_order_code_idx" ON "purchase_request_approval"("order_code");

-- CreateIndex
CREATE INDEX "purchase_request_approval_is_deleted_idx" ON "purchase_request_approval"("is_deleted");

-- CreateIndex
CREATE INDEX "purchase_request_approval_created_at_idx" ON "purchase_request_approval"("created_at");

-- CreateIndex
CREATE INDEX "purchase_request_item_finance_purchase_request_id_idx" ON "purchase_request_item_finance"("purchase_request_id");

-- CreateIndex
CREATE INDEX "purchase_request_item_finance_pr_item_ref_from_inv_idx" ON "purchase_request_item_finance"("pr_item_ref_from_inv");

-- CreateIndex
CREATE INDEX "purchase_request_item_finance_external_item_ref_idx" ON "purchase_request_item_finance"("external_item_ref");

-- CreateIndex
CREATE INDEX "purchase_request_item_finance_status_idx" ON "purchase_request_item_finance"("status");

-- CreateIndex
CREATE INDEX "purchase_request_item_finance_is_deleted_idx" ON "purchase_request_item_finance"("is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "disposal_revenue_disposal_ref_key" ON "disposal_revenue"("disposal_ref");

-- CreateIndex
CREATE INDEX "disposal_revenue_disposal_ref_idx" ON "disposal_revenue"("disposal_ref");

-- CreateIndex
CREATE INDEX "disposal_revenue_revenue_id_idx" ON "disposal_revenue"("revenue_id");

-- CreateIndex
CREATE INDEX "disposal_revenue_fixed_asset_id_idx" ON "disposal_revenue"("fixed_asset_id");

-- CreateIndex
CREATE INDEX "disposal_revenue_disposal_type_idx" ON "disposal_revenue"("disposal_type");

-- CreateIndex
CREATE INDEX "disposal_revenue_disposal_method_idx" ON "disposal_revenue"("disposal_method");

-- CreateIndex
CREATE INDEX "disposal_revenue_is_revenue_recorded_idx" ON "disposal_revenue"("is_revenue_recorded");

-- CreateIndex
CREATE INDEX "disposal_revenue_is_asset_updated_idx" ON "disposal_revenue"("is_asset_updated");

-- CreateIndex
CREATE INDEX "disposal_revenue_is_deleted_idx" ON "disposal_revenue"("is_deleted");

-- CreateIndex
CREATE INDEX "disposal_revenue_created_at_idx" ON "disposal_revenue"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "expense_adjustment_adjustment_code_key" ON "expense_adjustment"("adjustment_code");

-- CreateIndex
CREATE UNIQUE INDEX "expense_adjustment_journal_entry_id_key" ON "expense_adjustment"("journal_entry_id");

-- CreateIndex
CREATE INDEX "expense_adjustment_expense_id_idx" ON "expense_adjustment"("expense_id");

-- CreateIndex
CREATE INDEX "expense_adjustment_adjustment_code_idx" ON "expense_adjustment"("adjustment_code");

-- CreateIndex
CREATE INDEX "expense_adjustment_adjustment_type_idx" ON "expense_adjustment"("adjustment_type");

-- CreateIndex
CREATE INDEX "expense_adjustment_journal_entry_id_idx" ON "expense_adjustment"("journal_entry_id");

-- CreateIndex
CREATE INDEX "expense_adjustment_is_deleted_idx" ON "expense_adjustment"("is_deleted");

-- CreateIndex
CREATE INDEX "expense_adjustment_created_at_idx" ON "expense_adjustment"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "asset_type_code_key" ON "asset_type"("code");

-- CreateIndex
CREATE INDEX "asset_type_code_idx" ON "asset_type"("code");

-- CreateIndex
CREATE UNIQUE INDEX "fixed_asset_asset_code_key" ON "fixed_asset"("asset_code");

-- CreateIndex
CREATE INDEX "fixed_asset_asset_type_id_idx" ON "fixed_asset"("asset_type_id");

-- CreateIndex
CREATE INDEX "fixed_asset_inventory_item_ref_idx" ON "fixed_asset"("inventory_item_ref");

-- CreateIndex
CREATE INDEX "fixed_asset_status_idx" ON "fixed_asset"("status");

-- CreateIndex
CREATE INDEX "fixed_asset_disposal_ref_idx" ON "fixed_asset"("disposal_ref");

-- CreateIndex
CREATE INDEX "fixed_asset_disposal_date_idx" ON "fixed_asset"("disposal_date");

-- CreateIndex
CREATE INDEX "asset_accumulation_fixed_asset_id_idx" ON "asset_accumulation"("fixed_asset_id");

-- CreateIndex
CREATE INDEX "asset_accumulation_period_start_period_end_idx" ON "asset_accumulation"("period_start", "period_end");

-- AddForeignKey
ALTER TABLE "operational_trip_employee" ADD CONSTRAINT "operational_trip_employee_assignment_id_bus_trip_id_fkey" FOREIGN KEY ("assignment_id", "bus_trip_id") REFERENCES "operational_trip"("assignment_id", "bus_trip_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_trip_employee" ADD CONSTRAINT "operational_trip_employee_employee_number_fkey" FOREIGN KEY ("employee_number") REFERENCES "employees_cache"("employee_number") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_trip_employee" ADD CONSTRAINT "rental_trip_employee_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "rental_trip"("assignment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_trip_employee" ADD CONSTRAINT "rental_trip_employee_employee_number_fkey" FOREIGN KEY ("employee_number") REFERENCES "employees_cache"("employee_number") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_cache" ADD CONSTRAINT "payroll_cache_employee_number_fkey" FOREIGN KEY ("employee_number") REFERENCES "employees_cache"("employee_number") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_attendance_cache" ADD CONSTRAINT "payroll_attendance_cache_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payroll_cache"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_benefit_cache" ADD CONSTRAINT "payroll_benefit_cache_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payroll_cache"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_benefit_cache" ADD CONSTRAINT "payroll_benefit_cache_benefit_type_id_fkey" FOREIGN KEY ("benefit_type_id") REFERENCES "payroll_benefit_type_cache"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_cache" ADD CONSTRAINT "payroll_deduction_cache_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payroll_cache"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_deduction_cache" ADD CONSTRAINT "payroll_deduction_cache_deduction_type_id_fkey" FOREIGN KEY ("deduction_type_id") REFERENCES "payroll_deduction_type_cache"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chart_of_account" ADD CONSTRAINT "chart_of_account_account_type_id_fkey" FOREIGN KEY ("account_type_id") REFERENCES "account_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry" ADD CONSTRAINT "journal_entry_reversal_of_id_fkey" FOREIGN KEY ("reversal_of_id") REFERENCES "journal_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_line" ADD CONSTRAINT "journal_entry_line_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_line" ADD CONSTRAINT "journal_entry_line_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chart_of_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue" ADD CONSTRAINT "revenue_revenue_type_id_fkey" FOREIGN KEY ("revenue_type_id") REFERENCES "revenue_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue" ADD CONSTRAINT "revenue_operational_trip_assignment_id_operational_trip_bu_fkey" FOREIGN KEY ("operational_trip_assignment_id", "operational_trip_bus_trip_id") REFERENCES "operational_trip"("assignment_id", "bus_trip_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue" ADD CONSTRAINT "revenue_rental_trip_assignment_id_fkey" FOREIGN KEY ("rental_trip_assignment_id") REFERENCES "rental_trip"("assignment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue" ADD CONSTRAINT "revenue_receivable_id_fkey" FOREIGN KEY ("receivable_id") REFERENCES "receivable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue" ADD CONSTRAINT "revenue_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_installment_schedule" ADD CONSTRAINT "revenue_installment_schedule_receivable_id_fkey" FOREIGN KEY ("receivable_id") REFERENCES "receivable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_installment_payment" ADD CONSTRAINT "revenue_installment_payment_installment_id_fkey" FOREIGN KEY ("installment_id") REFERENCES "revenue_installment_schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_installment_payment" ADD CONSTRAINT "revenue_installment_payment_revenue_id_fkey" FOREIGN KEY ("revenue_id") REFERENCES "revenue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revenue_installment_payment" ADD CONSTRAINT "revenue_installment_payment_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_expense_type_id_fkey" FOREIGN KEY ("expense_type_id") REFERENCES "expense_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_operational_trip_assignment_id_operational_trip_bu_fkey" FOREIGN KEY ("operational_trip_assignment_id", "operational_trip_bus_trip_id") REFERENCES "operational_trip"("assignment_id", "bus_trip_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_rental_trip_assignment_id_fkey" FOREIGN KEY ("rental_trip_assignment_id") REFERENCES "rental_trip"("assignment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_payable_id_fkey" FOREIGN KEY ("payable_id") REFERENCES "payable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_installment_schedule" ADD CONSTRAINT "expense_installment_schedule_payable_id_fkey" FOREIGN KEY ("payable_id") REFERENCES "payable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_installment_payment" ADD CONSTRAINT "expense_installment_payment_installment_id_fkey" FOREIGN KEY ("installment_id") REFERENCES "expense_installment_schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_installment_payment" ADD CONSTRAINT "expense_installment_payment_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_installment_payment" ADD CONSTRAINT "expense_installment_payment_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_payroll_period_id_fkey" FOREIGN KEY ("payroll_period_id") REFERENCES "payroll_period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_employee_number_fkey" FOREIGN KEY ("employee_number") REFERENCES "employees_cache"("employee_number") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_item" ADD CONSTRAINT "payroll_item_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_item" ADD CONSTRAINT "payroll_item_item_type_id_fkey" FOREIGN KEY ("item_type_id") REFERENCES "payroll_item_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_attendance" ADD CONSTRAINT "payroll_attendance_payroll_id_fkey" FOREIGN KEY ("payroll_id") REFERENCES "payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_budget_cycle" ADD CONSTRAINT "department_budget_cycle_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "department_budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approved_budget_request" ADD CONSTRAINT "approved_budget_request_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "department_budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_budget_allocation" ADD CONSTRAINT "direct_budget_allocation_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "department_budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_usage" ADD CONSTRAINT "budget_usage_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "department_budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_usage" ADD CONSTRAINT "budget_usage_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_request_approval" ADD CONSTRAINT "purchase_request_approval_department_budget_id_fkey" FOREIGN KEY ("department_budget_id") REFERENCES "department_budget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_request_item_finance" ADD CONSTRAINT "purchase_request_item_finance_purchase_request_id_fkey" FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_request_approval"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disposal_revenue" ADD CONSTRAINT "disposal_revenue_revenue_id_fkey" FOREIGN KEY ("revenue_id") REFERENCES "revenue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disposal_revenue" ADD CONSTRAINT "disposal_revenue_fixed_asset_id_fkey" FOREIGN KEY ("fixed_asset_id") REFERENCES "fixed_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_adjustment" ADD CONSTRAINT "expense_adjustment_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_adjustment" ADD CONSTRAINT "expense_adjustment_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_asset" ADD CONSTRAINT "fixed_asset_asset_type_id_fkey" FOREIGN KEY ("asset_type_id") REFERENCES "asset_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_accumulation" ADD CONSTRAINT "asset_accumulation_fixed_asset_id_fkey" FOREIGN KEY ("fixed_asset_id") REFERENCES "fixed_asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
