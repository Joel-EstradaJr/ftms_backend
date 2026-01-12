/**
 * ==================== DEPRECATED ====================
 * 
 * THIS FILE IS DEPRECATED AND SHOULD NOT BE USED
 * 
 * As of the Payroll Module Alignment (January 2026), all payroll data
 * is sourced from the external HR API:
 *   https://backends-liart.vercel.app/api/clean/hr_payroll
 * 
 * Payroll data is now fetched and synced via:
 *   - lib/hr/payrollSync.ts (fetchAndSyncPayrollFromHR)
 *   - POST /api/integration/hr_payroll/fetch-and-sync
 *   - POST /api/integration/hr_payroll/refetch
 * 
 * Local seeding of payroll data is no longer supported as it
 * would create inconsistencies with the HR source of truth.
 * 
 * This file is kept for reference only.
 * =====================================================
 */

// Prevent accidental execution
if (require.main === module) {
  console.error('❌ ERROR: seed_payroll_cache.ts is DEPRECATED');
  console.error('Payroll data should be fetched from HR API, not seeded locally.');
  console.error('Use: POST /api/integration/hr_payroll/fetch-and-sync');
  process.exit(1);
}

/**
 * @deprecated - Do not use. Payroll data comes from HR API only.
 * PAYROLL CACHE SEED FILE (HISTORICAL REFERENCE ONLY)
 * Seeds dummy payroll data for employees (excluding Driver and PAO roles)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPayrollCache() {
  console.log('🌱 Seeding payroll cache data...');

  try {
    // First, seed benefit types
    const benefitTypes = [
      { id: '11', name: 'Service Incentive Leave' },
      { id: '12', name: 'Holiday Pay' },
      { id: '13', name: '13th Month Pay' },
      { id: '14', name: 'Safety' },
      { id: '15', name: 'Additional' },
      { id: '16', name: 'Meal Allowance' },
      { id: '17', name: 'Transport Allowance' },
      { id: '19', name: 'Performance Bonus' },
      { id: '20', name: 'Overtime Pay' },
    ];

    console.log('  Creating benefit types...');
    for (const bt of benefitTypes) {
      await prisma.payroll_benefit_type_cache.upsert({
        where: { id: bt.id },
        update: { name: bt.name },
        create: bt,
      });
    }

    // Seed deduction types
    const deductionTypes = [
      { id: '11', name: 'Cash Advance' },
      { id: '12', name: 'PAG-IBIG' },
      { id: '13', name: 'SSS' },
      { id: '14', name: 'PhilHealth' },
      { id: '15', name: 'Damage' },
      { id: '16', name: 'Shortage' },
      { id: '17', name: 'Tax' },
      { id: '18', name: 'Loan Repayment' },
      { id: '19', name: 'Late Penalty' },
    ];

    console.log('  Creating deduction types...');
    for (const dt of deductionTypes) {
      await prisma.payroll_deduction_type_cache.upsert({
        where: { id: dt.id },
        update: { name: dt.name },
        create: dt,
      });
    }

    // Seed employees (excluding Driver and PAO)
    const employees = [
      { employee_number: 'EMP-0005', first_name: 'John', last_name: 'Doe', position_id: 'POS-001', position_name: 'Accountant', department_id: 'DEPT-001', department_name: 'Finance' },
      { employee_number: 'EMP-0006', first_name: 'Jane', last_name: 'Smith', position_id: 'POS-002', position_name: 'HR Manager', department_id: 'DEPT-002', department_name: 'HR' },
      { employee_number: 'EMP-0007', first_name: 'Bob', last_name: 'Johnson', position_id: 'POS-003', position_name: 'IT Support', department_id: 'DEPT-003', department_name: 'IT' },
      { employee_number: 'EMP-0008', first_name: 'Alice', last_name: 'Williams', position_id: 'POS-004', position_name: 'Sales Rep', department_id: 'DEPT-004', department_name: 'Sales' },
      { employee_number: 'EMP-0009', first_name: 'Charlie', last_name: 'Brown', position_id: 'POS-005', position_name: 'Marketing', department_id: 'DEPT-005', department_name: 'Marketing' },
      { employee_number: 'EMP-0010', first_name: 'Diana', last_name: 'Davis', position_id: 'POS-006', position_name: 'Admin', department_id: 'DEPT-006', department_name: 'Admin' },
      { employee_number: 'EMP-0011', first_name: 'Eve', last_name: 'Miller', position_id: 'POS-007', position_name: 'Analyst', department_id: 'DEPT-007', department_name: 'Finance' },
      { employee_number: 'EMP-0012', first_name: 'Frank', last_name: 'Wilson', position_id: 'POS-008', position_name: 'Engineer', department_id: 'DEPT-008', department_name: 'Engineering' },
      { employee_number: 'EMP-0013', first_name: 'Grace', last_name: 'Moore', position_id: 'POS-009', position_name: 'Manager', department_id: 'DEPT-009', department_name: 'Operations' },
      { employee_number: 'EMP-0014', first_name: 'Henry', last_name: 'Taylor', position_id: 'POS-010', position_name: 'Supervisor', department_id: 'DEPT-010', department_name: 'Operations' },
      { employee_number: 'EMP-0015', first_name: 'Iris', last_name: 'Anderson', position_id: 'POS-011', position_name: 'Clerk', department_id: 'DEPT-011', department_name: 'Admin' },
      { employee_number: 'EMP-0016', first_name: 'Jack', last_name: 'Thomas', position_id: 'POS-012', position_name: 'Coordinator', department_id: 'DEPT-012', department_name: 'HR' },
      { employee_number: 'EMP-0017', first_name: 'Karen', last_name: 'Jackson', position_id: 'POS-013', position_name: 'Specialist', department_id: 'DEPT-013', department_name: 'IT' },
      { employee_number: 'EMP-0018', first_name: 'Leo', last_name: 'White', position_id: 'POS-014', position_name: 'Officer', department_id: 'DEPT-014', department_name: 'Finance' },
      { employee_number: 'EMP-0019', first_name: 'Mia', last_name: 'Harris', position_id: 'POS-015', position_name: 'Assistant', department_id: 'DEPT-015', department_name: 'Sales' },
      { employee_number: 'EMP-0020', first_name: 'Nathan', last_name: 'Martin', position_id: 'POS-016', position_name: 'Consultant', department_id: 'DEPT-016', department_name: 'Marketing' },
    ];

    console.log('  Creating employees...');
    for (const emp of employees) {
      await prisma.employees_cache.upsert({
        where: { employee_number: emp.employee_number },
        update: emp,
        create: emp,
      });
    }

    // Seed payroll cache records
    const payrollData = [
      { employee_number: 'EMP-0005', basic_rate: 600, rate_type: 'MONTHLY', benefit_type_id: '19', benefit_value: 750, benefit_freq: 'Daily', deduction_type_id: '11', deduction_value: 200, deduction_freq: 'Weekly' },
      { employee_number: 'EMP-0006', basic_rate: 625, rate_type: 'WEEKLY', benefit_type_id: '15', benefit_value: 750, benefit_freq: 'Weekly', deduction_type_id: '11', deduction_value: 200, deduction_freq: 'Once' },
      { employee_number: 'EMP-0007', basic_rate: 650, rate_type: 'DAILY', benefit_type_id: '14', benefit_value: 750, benefit_freq: 'Monthly', deduction_type_id: '12', deduction_value: 200, deduction_freq: 'Daily' },
      { employee_number: 'EMP-0008', basic_rate: 675, rate_type: 'WEEKLY', benefit_type_id: '16', benefit_value: 750, benefit_freq: 'Once', deduction_type_id: '18', deduction_value: 200, deduction_freq: 'Weekly' },
      { employee_number: 'EMP-0009', basic_rate: 700, rate_type: 'DAILY', benefit_type_id: '19', benefit_value: 750, benefit_freq: 'Daily', deduction_type_id: '19', deduction_value: 200, deduction_freq: 'Daily' },
      { employee_number: 'EMP-0010', basic_rate: 725, rate_type: 'DAILY', benefit_type_id: '17', benefit_value: 750, benefit_freq: 'Once', deduction_type_id: '19', deduction_value: 200, deduction_freq: 'Yearly' },
      { employee_number: 'EMP-0011', basic_rate: 750, rate_type: 'DAILY', benefit_type_id: '11', benefit_value: 750, benefit_freq: 'Monthly', deduction_type_id: '17', deduction_value: 200, deduction_freq: 'Yearly' },
      { employee_number: 'EMP-0012', basic_rate: 775, rate_type: 'DAILY', benefit_type_id: '17', benefit_value: 750, benefit_freq: 'Once', deduction_type_id: '13', deduction_value: 200, deduction_freq: 'Daily' },
      { employee_number: 'EMP-0013', basic_rate: 800, rate_type: 'SEMI_MONTHLY', benefit_type_id: '11', benefit_value: 750, benefit_freq: 'Once', deduction_type_id: '11', deduction_value: 200, deduction_freq: 'Yearly' },
      { employee_number: 'EMP-0014', basic_rate: 825, rate_type: 'SEMI_MONTHLY', benefit_type_id: '13', benefit_value: 750, benefit_freq: 'Once', deduction_type_id: '15', deduction_value: 200, deduction_freq: 'Weekly' },
      { employee_number: 'EMP-0015', basic_rate: 850, rate_type: 'WEEKLY', benefit_type_id: '20', benefit_value: 750, benefit_freq: 'Yearly', deduction_type_id: '16', deduction_value: 200, deduction_freq: 'Yearly' },
      { employee_number: 'EMP-0016', basic_rate: 875, rate_type: 'MONTHLY', benefit_type_id: '14', benefit_value: 750, benefit_freq: 'Weekly', deduction_type_id: '11', deduction_value: 200, deduction_freq: 'Weekly' },
      { employee_number: 'EMP-0017', basic_rate: 900, rate_type: 'MONTHLY', benefit_type_id: '14', benefit_value: 750, benefit_freq: 'Monthly', deduction_type_id: '15', deduction_value: 200, deduction_freq: 'Daily' },
      { employee_number: 'EMP-0018', basic_rate: 925, rate_type: 'DAILY', benefit_type_id: '19', benefit_value: 750, benefit_freq: 'Daily', deduction_type_id: '15', deduction_value: 200, deduction_freq: 'Yearly' },
      { employee_number: 'EMP-0019', basic_rate: 950, rate_type: 'DAILY', benefit_type_id: '12', benefit_value: 750, benefit_freq: 'Once', deduction_type_id: '12', deduction_value: 200, deduction_freq: 'Yearly' },
      { employee_number: 'EMP-0020', basic_rate: 975, rate_type: 'SEMI_MONTHLY', benefit_type_id: '19', benefit_value: 750, benefit_freq: 'Monthly', deduction_type_id: '12', deduction_value: 200, deduction_freq: 'Weekly' },
    ];

    console.log('  Creating payroll records with attendances, benefits, and deductions...');
    for (const data of payrollData) {
      const payroll = await prisma.payroll_cache.create({
        data: {
          employee_number: data.employee_number,
          payroll_period_start: new Date('2026-01-01'),
          payroll_period_end: new Date('2026-01-31'),
          basic_rate: data.basic_rate,
          rate_type: data.rate_type as any,
          employee_position_name: employees.find(e => e.employee_number === data.employee_number)?.position_name,
          employee_department_name: employees.find(e => e.employee_number === data.employee_number)?.department_name,
        },
      });

      // Create attendance record
      await prisma.payroll_attendance_cache.create({
        data: {
          payroll_id: payroll.id,
          date: new Date('2026-01-09'),
          status: 'Present',
        },
      });

      // Create benefit
      await prisma.payroll_benefit_cache.create({
        data: {
          payroll_id: payroll.id,
          benefit_type_id: data.benefit_type_id,
          value: data.benefit_value,
          frequency: data.benefit_freq,
          effective_date: new Date('2025-11-11'),
          end_date: null,
          is_active: true,
        },
      });

      // Create deduction
      await prisma.payroll_deduction_cache.create({
        data: {
          payroll_id: payroll.id,
          deduction_type_id: data.deduction_type_id,
          value: data.deduction_value,
          frequency: data.deduction_freq,
          effective_date: new Date('2025-10-12'),
          end_date: null,
          is_active: true,
        },
      });
    }

    console.log('✅ Payroll cache seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding payroll cache:', error);
    throw error;
  }
}

// Execute if run directly
if (require.main === module) {
  seedPayrollCache()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedPayrollCache };
