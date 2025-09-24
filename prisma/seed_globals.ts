import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDynamicGlobals() {
  // Delete module links first, then global records
  await prisma.$transaction([
    prisma.modulePaymentMethod.deleteMany(),
    prisma.moduleTerms.deleteMany(),
    prisma.moduleSource.deleteMany(),
    prisma.moduleCategory.deleteMany(),
  ]);

  await prisma.$transaction([
    prisma.globalPaymentMethod.deleteMany(),
    prisma.globalTerms.deleteMany(),
    prisma.globalSource.deleteMany(),
    prisma.globalCategory.deleteMany(),
  ]);
}

async function seedCategories() {
  const expenseCategories = ['Fuel', 'Equipments', 'Consumables', 'Service', 'Tools'];
  const revenueCategories = ['Percentage', 'Boundary', 'Bus Rental'];

  const all = Array.from(new Set([...expenseCategories, ...revenueCategories]));
  const nameToId = new Map<string, string>();

  for (const name of all) {
    const cat = await prisma.globalCategory.upsert({
      where: { name },
      update: { is_active: true, is_deleted: false },
      create: { name },
    });
    nameToId.set(name, cat.id);
  }

  const linkData: { module_name: string; category_id: string }[] = [];
  for (const name of expenseCategories) linkData.push({ module_name: 'expense', category_id: nameToId.get(name)! });
  for (const name of revenueCategories) linkData.push({ module_name: 'revenue', category_id: nameToId.get(name)! });
  if (linkData.length) await prisma.moduleCategory.createMany({ data: linkData, skipDuplicates: true });

  return { categories: all, links: linkData };
}

async function seedSources() {
  const sources = ['Company Cash', 'Reimbursement', 'Renter Damage'];
  const nameToId = new Map<string, string>();

  for (const name of sources) {
    const src = await prisma.globalSource.upsert({
      where: { name },
      update: { is_active: true, is_deleted: false },
      create: { name },
    });
    nameToId.set(name, src.id);
  }

  const linkData = Array.from(nameToId.values()).map((id) => ({ module_name: 'expense', source_id: id }));
  if (linkData.length) await prisma.moduleSource.createMany({ data: linkData, skipDuplicates: true });

  return { sources, links: linkData };
}

async function seedTerms() {
  const terms = ['Installment', 'Cash', 'Net 15', 'Net 30', 'Net 60', 'Net 90'];
  const nameToId = new Map<string, string>();

  for (const name of terms) {
    const t = await prisma.globalTerms.upsert({
      where: { name },
      update: { is_active: true, is_deleted: false },
      create: { name },
    });
    nameToId.set(name, t.id);
  }

  const linkData = Array.from(nameToId.values()).map((id) => ({ module_name: 'expense', terms_id: id }));
  if (linkData.length) await prisma.moduleTerms.createMany({ data: linkData, skipDuplicates: true });

  return { terms, links: linkData };
}

async function seedPaymentMethods() {
  const methods = ['Cash', 'GCash', 'Credit Card', 'Check'];
  const nameToId = new Map<string, string>();

  for (const name of methods) {
    const pm = await prisma.globalPaymentMethod.upsert({
      where: { name },
      update: { is_active: true, is_deleted: false },
      create: { name },
    });
    nameToId.set(name, pm.id);
  }

  const linkData = Array.from(nameToId.values()).map((id) => ({ module_name: 'expense', payment_method_id: id }));
  if (linkData.length) await prisma.modulePaymentMethod.createMany({ data: linkData, skipDuplicates: true });

  return { methods, links: linkData };
}

async function main() {
  await clearDynamicGlobals();

  const [catRes, srcRes, termRes, pmRes] = await Promise.all([
    seedCategories(),
    seedSources(),
    seedTerms(),
    seedPaymentMethods(),
  ]);

  console.log('Seeding completed:');
  console.log(`  Categories: ${catRes.categories.length}, Links: ${catRes.links.length}`);
  console.log(`  Sources: ${srcRes.sources.length}, Links: ${srcRes.links.length}`);
  console.log(`  Terms: ${termRes.terms.length}, Links: ${termRes.links.length}`);
  console.log(`  Payment Methods: ${pmRes.methods.length}, Links: ${pmRes.links.length}`);
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });