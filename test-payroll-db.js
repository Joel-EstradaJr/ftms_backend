import { PrismaClient } from '@prisma/client';

async function testPayrollDB() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✓ Database connected successfully');
    
    // Test PayrollRecord count
    const count = await prisma.payrollRecord.count();
    console.log('✓ PayrollRecord count:', count);
    
    // Test PayrollRecord findMany
    const records = await prisma.payrollRecord.findMany({
      take: 2,
      where: { is_deleted: false }
    });
    console.log('✓ Sample records:', records.length);
    
  } catch (error) {
    console.error('✗ Database error:', error.message);
    console.error('Error details:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPayrollDB();
