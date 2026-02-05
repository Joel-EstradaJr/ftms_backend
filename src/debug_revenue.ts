
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const rev = await prisma.revenue.findFirst({
        where: { code: 'REV-2026-0005' },
        include: {
            journal_entry: {
                include: { lines: true }
            }
        }
    });

    if (!rev) {
        console.log('Revenue not found');
        return;
    }

    console.log(`Revenue: ${rev.code}`);
    console.log(`Amount: ${rev.amount}`);
    console.log(`JE ID: ${rev.journal_entry_id}`);

    if (rev.journal_entry) {
        console.log(`JE Code: ${rev.journal_entry.code}`);
        console.log(`JE Lines:`);
        rev.journal_entry.lines.forEach(line => {
            console.log(`  - ${line.account_id}: Debit ${line.debit}, Credit ${line.credit}`);
        });
    } else {
        console.log('No JE linked.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
