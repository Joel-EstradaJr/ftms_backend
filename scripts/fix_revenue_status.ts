
import { prisma } from '../src/config/database';
import { Prisma } from '@prisma/client';

async function main() {
    console.log('🔄 Starting revenue status fix...');

    const revenues = await prisma.revenue.findMany({
        include: {
            bus_trip: true
        }
    });

    console.log(`Found ${revenues.length} revenue records.`);

    let updatedCount = 0;

    for (const rev of revenues) {
        if (!rev.bus_trip) {
            console.log(`Skipping Revenue #${rev.id}: No bus trip linked`);
            continue;
        }

        const trip = rev.bus_trip;
        const tripRevenue = trip.trip_revenue ? new Prisma.Decimal(trip.trip_revenue) : new Prisma.Decimal(0);
        const tripFuel = trip.trip_fuel_expense ? new Prisma.Decimal(trip.trip_fuel_expense) : new Prisma.Decimal(0);
        const assignmentValue = trip.assignment_value ? new Prisma.Decimal(trip.assignment_value) : new Prisma.Decimal(0);

        // Calculate Expected Remittance
        let expectedRemittance = new Prisma.Decimal(0);
        if (trip.assignment_type === 'BOUNDARY') {
            expectedRemittance = tripFuel.add(assignmentValue);
        } else if (trip.assignment_type === 'PERCENTAGE') {
            // assignment_value is percentage (e.g., 30) or decimal (0.30)?
            // Assuming it matches the service logic: companyShare = revenue * value
            // But wait, in service: `const companyShare = revenue.mul(value);`
            // Let's assume the value is stored correctly as a multiplier or we divide if needed. 
            // Looking at the data: ID 5: TripRevenue 1400, Expected 436. 
            // Fuel? Not shown in API response.
            // If Fuel is 16 (example). 1400 * 0.3 = 420. 420 + 16 = 436.
            // So logic matches service: revenue * value + fuel.

            const companyShare = tripRevenue.mul(assignmentValue);
            expectedRemittance = companyShare.add(tripFuel);
        } else {
            // Default Boundary logic
            expectedRemittance = tripFuel.add(assignmentValue);
        }

        const amountPaid = rev.amount ? new Prisma.Decimal(rev.amount) : new Prisma.Decimal(0);

        // Determine correct status
        // If amount_paid >= expected -> COMPLETED
        // Else -> PARTIALLY_PAID (or PENDING if 0? but we'll use PARTIALLY_PAID for simplicity if it's recorded)
        let newStatus = 'PENDING';

        if (amountPaid.greaterThanOrEqualTo(expectedRemittance)) {
            newStatus = 'COMPLETED';
        } else {
            // If it has receivables (shortage > 0), it's PARTIALLY_PAID
            newStatus = 'PARTIALLY_PAID';
        }

        // Only update if changed
        if (rev.payment_status !== newStatus) {
            console.log(`Updating Revenue #${rev.id}: Status ${rev.payment_status} -> ${newStatus} (Amount: ${amountPaid}, Expected: ${expectedRemittance})`);

            await prisma.revenue.update({
                where: { id: rev.id },
                data: { payment_status: newStatus as any }
            });
            updatedCount++;
        }
    }

    console.log(`✅ Fixed ${updatedCount} revenue records.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
