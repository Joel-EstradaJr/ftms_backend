
import { prisma } from '../src/config/database';
import { Prisma } from '@prisma/client';

async function main() {
    console.log('🔄 Starting receivable installment fix...');

    const receivables = await prisma.receivable.findMany({
        where: {
            is_deleted: false,
            // Optimization: Only check those with > 0 payments
            paid_amount: { gt: 0 }
        },
        include: {
            installment_schedule: {
                orderBy: { installment_number: 'asc' }
            }
        }
    });

    console.log(`Found ${receivables.length} receivables with payments.`);

    let fixedCount = 0;

    for (const rec of receivables) {
        if (!rec.installment_schedule || rec.installment_schedule.length === 0) continue;

        const totalPaid = Number(rec.paid_amount);
        let remainingPaid = totalPaid;
        let hasChanges = false;

        const updates = [];

        for (const inst of rec.installment_schedule) {
            const instAmountDue = Number(inst.amount_due);
            const amountForThisInst = Math.min(instAmountDue, remainingPaid);
            remainingPaid = Math.max(0, remainingPaid - amountForThisInst);
            const instBalance = instAmountDue - amountForThisInst;

            let instStatus = 'PENDING';
            if (instBalance <= 0.005) {
                instStatus = 'PAID';
            } else if (amountForThisInst > 0) {
                instStatus = 'PARTIALLY_PAID';
            } else {
                if (inst.status === 'OVERDUE') instStatus = 'OVERDUE';
                else instStatus = 'PENDING';
            }

            // Check if update needed
            const currentPaid = Number(inst.amount_paid);
            const currentBalance = Number(inst.balance);

            // Debug
            console.log(`Inst #${inst.installment_number}: due=${instAmountDue}, paid=${currentPaid}, calcPaid=${amountForThisInst}, status=${inst.status}, newStatus=${instStatus}`);

            if (Math.abs(currentPaid - amountForThisInst) > 0.005 ||
                Math.abs(currentBalance - instBalance) > 0.005 ||
                inst.status !== instStatus) {

                console.log(`Fixing Inst #${inst.installment_number}: Status ${inst.status} -> ${instStatus}`);
                updates.push(
                    prisma.revenue_installment_schedule.update({
                        where: { id: inst.id },
                        data: {
                            amount_paid: amountForThisInst,
                            balance: instBalance,
                            status: instStatus as any
                        }
                    })
                );
            }
        }

        if (updates.length > 0) {
            console.log(`Fixing Receivable #${rec.id} (${rec.code}): Updating ${updates.length} installments...`);
            await prisma.$transaction(updates);
            fixedCount++;
        }
    }

    console.log(`✅ Fixed installments for ${fixedCount} receivables.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
