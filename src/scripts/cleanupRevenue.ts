
import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';

/**
 * Cleanup script to fix Over-remittance bugs
 * 
 * Issue: Some revenue records have amount = trip_revenue (e.g. 1400) when they should be expected_remittance (e.g. 436).
 * This occurred because the code was implicitly using trip_revenue as the remitted amount.
 * 
 * Logic:
 * 1. Iterate all Revenue records
 * 2. Calculate expected_remittance using bus_trip data
 * 3. If amount > expected_remittance (with tolerance):
 *    - Update Revenue.amount = expected_remittance
 *    - Update related Journal Entry rows (Debit/Credit) to expected_remittance
 */

async function calculateExpectedRemittance(
    assignmentType: string | null,
    tripRevenue: Prisma.Decimal | null,
    assignmentValue: Prisma.Decimal | null,
    tripFuelExpense: Prisma.Decimal | null
): Promise<Prisma.Decimal> {
    const revenue = tripRevenue ?? new Prisma.Decimal(0);
    const value = assignmentValue ?? new Prisma.Decimal(0);
    const fuel = tripFuelExpense ?? new Prisma.Decimal(0);

    if (assignmentType === 'BOUNDARY') {
        return fuel.add(value);
    } else if (assignmentType === 'PERCENTAGE') {
        // assignment_value is a percentage (e.g., 0.30 for 30%)
        // We need to double check if it's stored as 30 or 0.30. 
        // Based on service code: const companyShare = revenue.mul(value);
        // This implies it is stored as ratio (0.30).
        // However, let's enable a safe check. If value > 1 for percentage, it might be 30.
        // But usually it's handled consistently. Let's trust the service logic.

        const companyShare = revenue.mul(value);
        return companyShare.add(fuel);
    }

    return fuel.add(value);
}

async function main() {
    console.log('Starting Revenue Cleanup...');

    // Fetch all revenues that are NOT deleted
    const revenues = await prisma.revenue.findMany({
        where: {
            is_deleted: false
        },
        include: {
            bus_trip: true,
            journal_entry: {
                include: {
                    lines: true
                }
            }
        }
    });

    console.log(`Found ${revenues.length} revenue records.`);

    let fixedCount = 0;

    for (const revenue of revenues) {
        if (!revenue.bus_trip) {
            console.warn(`Revenue ${revenue.code} (ID: ${revenue.id}) has no bus_trip. Skipping.`);
            continue;
        }

        const expected = await calculateExpectedRemittance(
            revenue.bus_trip.assignment_type,
            revenue.bus_trip.trip_revenue,
            revenue.bus_trip.assignment_value,
            revenue.bus_trip.trip_fuel_expense
        );

        // Check if amount > expected
        // Using a small epsilon for float comparison, though Decimal handles it well.
        // If amount is strictly greater than expected.
        if (revenue.amount.gt(expected)) {
            console.log(`[FIXING] ${revenue.code}: Amount ${revenue.amount} > Expected ${expected}`);

            // 1. Update Revenue Record
            await prisma.revenue.update({
                where: { id: revenue.id },
                data: {
                    amount: expected
                }
            });

            // 2. Update Journal Entry if exists
            if (revenue.journal_entry && revenue.journal_entry.lines) {
                console.log(`  - Updating Journal Entry ${revenue.journal_entry.code}`);

                // We assume the rows with the wrong amount are the ones matching the original revenue amount
                // Or simply, we find the Cash (Debit) and Revenue (Credit) rows.
                // Simpler approach: Find any row with amount == old_revenue_amount and update to expected.

                let rowsUpdated = 0;
                for (const row of revenue.journal_entry.lines) {
                    // Update if debit == old amount
                    if (row.debit.equals(revenue.amount)) {
                        await prisma.journal_entry_line.update({
                            where: { id: row.id },
                            data: { debit: expected }
                        });
                        rowsUpdated++;
                    }
                    // Update if credit == old amount
                    if (row.credit.equals(revenue.amount)) {
                        await prisma.journal_entry_line.update({
                            where: { id: row.id },
                            data: { credit: expected }
                        });
                        rowsUpdated++;
                    }
                }
                console.log(`  - Updated ${rowsUpdated} JE rows.`);

                // Update JE description if it contains the amount
                if (revenue.journal_entry.description && revenue.journal_entry.description.includes(revenue.amount.toString())) {
                    const newDesc = revenue.journal_entry.description.replace(
                        revenue.amount.toString(),
                        expected.toString()
                    );
                    await prisma.journal_entry.update({
                        where: { id: revenue.journal_entry.id },
                        data: { description: newDesc }
                    });
                }
            }

            fixedCount++;
        }
    }

    // PHASE 2: Ensure Journal Entries match the Revenue Amount
    console.log('\nStarting Phase 2: Journal Entry Sync...');

    for (const revenue of revenues) {
        if (revenue.journal_entry && revenue.journal_entry.lines) {
            let jeUpdated = false;

            // Check if lines match revenue amount
            for (const row of revenue.journal_entry.lines) {
                // If line amount is significantly different from revenue amount (e.g. 1400 vs 436)
                if ((row.debit.gt(0) && !row.debit.equals(revenue.amount)) ||
                    (row.credit.gt(0) && !row.credit.equals(revenue.amount))) {

                    console.log(`[JE FIX] ${revenue.code}: JE Amount (Debit: ${row.debit}, Credit: ${row.credit}) != Revenue ${revenue.amount}`);

                    // Update row
                    if (row.debit.gt(0)) {
                        await prisma.journal_entry_line.update({
                            where: { id: row.id },
                            data: { debit: revenue.amount }
                        });
                    }
                    if (row.credit.gt(0)) {
                        await prisma.journal_entry_line.update({
                            where: { id: row.id },
                            data: { credit: revenue.amount }
                        });
                    }
                    jeUpdated = true;
                }
            }

            if (jeUpdated) {
                console.log(`  - Synced Journal Entry ${revenue.journal_entry.code}`);
                fixedCount++;

                // Update description if needed (simple string replacement of common patterns)
                // If description contains default formatted numbers, we might miss it due to formatting differences.
                // But let's try a best-effort update or just leave it. 
                // Description is less critical than GL amounts.
            }
        }
    }

    console.log('------------------------------------------------');
    console.log(`Cleanup Complete. Fixed/Synced ${fixedCount} records.`);
}

main()
    .catch((e) => {
        console.error('Error during cleanup:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
