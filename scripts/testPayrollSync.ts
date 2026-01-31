/**
 * Test Script: Payroll Sync
 * 
 * Run with: npx tsx scripts/testPayrollSync.ts
 */

import { fetchAndSyncPayrollFromHR } from '../lib/hr/payrollSync';

async function testPayrollSync() {
    console.log('🧪 Testing Payroll Sync...\n');

    // Use the test date range
    const periodStart = '2026-01-01';
    const periodEnd = '2026-01-31';

    console.log(`📆 Period: ${periodStart} to ${periodEnd}`);
    console.log(`🔗 Source: https://backends-liart.vercel.app/api/clean/hr_payroll\n`);

    try {
        const result = await fetchAndSyncPayrollFromHR(periodStart, periodEnd);

        console.log('📊 Results:');
        console.log(`   ✅ Success: ${result.success}`);
        console.log(`   👥 Employees Synced: ${result.synced}`);
        console.log(`   📁 Period ID: ${result.periodId}`);

        if (result.errors.length > 0) {
            console.log(`\n⚠️ Errors (${result.errors.length}):`);
            result.errors.forEach((err, i) => {
                console.log(`   ${i + 1}. ${err}`);
            });
        }

        console.log('\n✅ Test completed successfully!');
        console.log('\n💡 Check the database for:');
        console.log('   - payroll_period table for the batch record');
        console.log('   - payroll table for individual employee payrolls');
        console.log('   - payroll_item table for benefits/deductions breakdown');
        console.log('   - payroll_attendance table for attendance records');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }

    process.exit(0);
}

testPayrollSync();
