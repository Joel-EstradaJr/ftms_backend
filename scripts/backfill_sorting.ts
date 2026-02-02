
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting backfill of updated_at...');

    // Update all revenue records where updated_at is null
    const result = await prisma.$executeRaw`
        UPDATE revenue 
        SET updated_at = created_at 
        WHERE updated_at IS NULL
    `;

    console.log(`Backfilled ${result} revenue records.`);

    // Also update system_configuration if needed (optional)
    const sysResult = await prisma.$executeRaw`
        UPDATE system_configuration 
        SET updated_at = created_at 
        WHERE updated_at IS NULL
    `;
    console.log(`Backfilled ${sysResult} system_configuration records.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
