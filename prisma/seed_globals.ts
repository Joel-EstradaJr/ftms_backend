import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDynamicGlobals() {
  // Delete module links first, then global records
  await prisma.$transaction([
    prisma.modulePaymentMethod.deleteMany(),
    prisma.moduleTerms.deleteMany(),
    prisma.moduleSource.deleteMany(),
    prisma.moduleCategory.deleteMany(),
    // Newly added module link tables
    (prisma as any).moduleReimbursementStatus.deleteMany(),
    (prisma as any).moduleFrequency.deleteMany(),
    (prisma as any).modulePayrollStatus.deleteMany(),
    (prisma as any).moduleScheduleType.deleteMany(),
    (prisma as any).moduleInstallmentStatus.deleteMany(),
  ]);

  await prisma.$transaction([
    prisma.globalPaymentMethod.deleteMany(),
    prisma.globalTerms.deleteMany(),
    prisma.globalSource.deleteMany(),
    prisma.globalCategory.deleteMany(),
    // Newly added global tables
    (prisma as any).globalReimbursementStatus.deleteMany(),
    (prisma as any).globalFrequency.deleteMany(),
    (prisma as any).globalPayrollStatus.deleteMany(),
    (prisma as any).globalScheduleType.deleteMany(),
    (prisma as any).globalInstallmentStatus.deleteMany(),
  ]);
}

async function seedCategories() {
  const expenseCategories = ['Fuel', 'Payroll', 'Equipments', 'Consumables', 'Service', 'Tools'];
  const revenueCategories = ['Percentage', 'Boundary', 'Bus Rental', 'Advertising', 'Donations'];

  const all = Array.from(new Set([...expenseCategories, ...revenueCategories]));
  const nameToId = new Map<string, string>();

  for (const name of all) {
    const cat = await prisma.globalCategory.upsert({
      where: { name },
      update: { is_active: true, is_deleted: false },
      create: { name },
    });
    nameToId.set(name, (cat as any).id);
  }

  const linkData: { module_name: string; category_id: string }[] = [];
  for (const name of expenseCategories) linkData.push({ module_name: 'expense', category_id: nameToId.get(name)! });
  for (const name of revenueCategories) linkData.push({ module_name: 'revenue', category_id: nameToId.get(name)! });
  if (linkData.length) await prisma.moduleCategory.createMany({ data: linkData, skipDuplicates: true });

  return { categories: all, links: linkData };
}

async function seedSources() {
  const sources = ['Cash', 'Reimbursement', 'RenterDamage'];
  const nameToId = new Map<string, string>();

  for (const name of sources) {
    const src = await prisma.globalSource.upsert({
      where: { name },
      update: { is_active: true, is_deleted: false },
      create: { name },
    });
    nameToId.set(name, (src as any).id);
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

  const linkDataExpense = Array.from(nameToId.values()).map((id) => ({ module_name: 'expense', payment_method_id: id }));
  const linkDataRevenue = Array.from(nameToId.values()).map((id) => ({ module_name: 'revenue', payment_method_id: id }));
  const linkData = [...linkDataExpense, ...linkDataRevenue];
  if (linkData.length) await prisma.modulePaymentMethod.createMany({ data: linkData, skipDuplicates: true });

  return { methods, links: linkData };
}

async function seedPaymentStatuses() {
  const statuses = ['Paid', 'Pending', 'Due', 'Overdue'];
  const created = [] as string[];
  for (const name of statuses) {
    const ps = await prisma.globalPaymentStatus.upsert({
      where: { name },
      update: { applicable_modules: ['expense', 'revenue'] },
      create: { name, applicable_modules: ['expense', 'revenue'] },
    });
    created.push(ps.id);
  }
  return { statuses, ids: created };
}

async function seedInstallmentStatuses() {
  const statuses = ['Pending', 'Partial', 'Paid', 'Overpaid', 'Late'];
  const nameToId = new Map<string, string>();

  for (const name of statuses) {
    const s = await (prisma as any).globalInstallmentStatus.upsert({
      where: { name },
      update: { is_active: true, is_deleted: false },
      create: { name },
    });
    nameToId.set(name, s.id);
  }

  const links = Array.from(nameToId.values()).map((id) => ({ module_name: 'revenue', installment_status_id: id }));
  if (links.length) await (prisma as any).moduleInstallmentStatus.createMany({ data: links, skipDuplicates: true });
  return { statuses, links };
}

async function seedScheduleTypes() {
  const types = ['None', 'Daily', 'Weekly', 'Semi-monthly', 'Monthly'];
  const nameToId = new Map<string, string>();

  for (const name of types) {
    const t = await (prisma as any).globalScheduleType.upsert({
      where: { name },
      update: { is_active: true, is_deleted: false },
      create: { name },
    });
    nameToId.set(name, t.id);
  }

  const links = Array.from(nameToId.values()).map((id) => ({ module_name: 'revenue', schedule_type_id: id }));
  if (links.length) await (prisma as any).moduleScheduleType.createMany({ data: links, skipDuplicates: true });
  return { types, links };
}

async function seedPayrollStatuses() {
  const statuses = ['Draft', 'Pending', 'Validated', 'Paid'];
  const nameToId = new Map<string, string>();
  for (const name of statuses) {
    const s = await (prisma as any).globalPayrollStatus.upsert({
      where: { name },
      update: { is_active: true, is_deleted: false },
      create: { name },
    });
    nameToId.set(name, s.id);
  }
  const links = Array.from(nameToId.values()).map((id) => ({ module_name: 'payroll', payroll_status_id: id }));
  if (links.length) await (prisma as any).modulePayrollStatus.createMany({ data: links, skipDuplicates: true });
  return { statuses, links };
}

async function seedFrequencies() {
  const frequencies = ['Weekly', 'Semi-monthly', 'Monthly'];
  const nameToId = new Map<string, string>();
  for (const name of frequencies) {
    const f = await (prisma as any).globalFrequency.upsert({
      where: { name },
      update: { is_active: true, is_deleted: false },
      create: { name },
    });
    nameToId.set(name, f.id);
  }
  const links = Array.from(nameToId.values()).map((id) => ({ module_name: 'payroll', frequency_id: id }));
  if (links.length) await (prisma as any).moduleFrequency.createMany({ data: links, skipDuplicates: true });
  return { frequencies, links };
}

async function seedReimbursementStatuses() {
  const statuses = ['Pending', 'Approved', 'Rejected', 'Paid', 'Cancelled'];
  const nameToId = new Map<string, string>();
  for (const name of statuses) {
    const s = await (prisma as any).globalReimbursementStatus.upsert({
      where: { name },
      update: { is_active: true, is_deleted: false },
      create: { name },
    });
    nameToId.set(name, s.id);
  }
  const links = Array.from(nameToId.values()).map((id) => ({ module_name: 'reimbursement', reimbursement_status_id: id }));
  if (links.length) await (prisma as any).moduleReimbursementStatus.createMany({ data: links, skipDuplicates: true });
  return { statuses, links };
}

async function main() {
  await clearDynamicGlobals();

  const [catRes, srcRes, termRes, pmRes, psRes] = await Promise.all([
    seedCategories(),
    seedSources(),
    seedTerms(),
    seedPaymentMethods(),
    seedPaymentStatuses(),
  ]);

  const [instRes, schedRes, pstatRes, freqRes, reimbRes] = await Promise.all([
    seedInstallmentStatuses(),
    seedScheduleTypes(),
    seedPayrollStatuses(),
    seedFrequencies(),
    seedReimbursementStatuses(),
  ]);

  console.log('Seeding completed:');
  console.log(`  Categories: ${catRes.categories.length}, Links: ${catRes.links.length}`);
  console.log(`  Sources: ${srcRes.sources.length}, Links: ${srcRes.links.length}`);
  console.log(`  Terms: ${termRes.terms.length}, Links: ${termRes.links.length}`);
  console.log(`  Payment Methods: ${pmRes.methods.length}, Links: ${pmRes.links.length}`);
  console.log(`  Payment Statuses: ${psRes.statuses.length}`);
  console.log(`  Installment Statuses: ${instRes.statuses.length}, Links: ${instRes.links.length}`);
  console.log(`  Schedule Types: ${schedRes.types.length}, Links: ${schedRes.links.length}`);
  console.log(`  Payroll Statuses: ${pstatRes.statuses.length}, Links: ${pstatRes.links.length}`);
  console.log(`  Frequencies: ${freqRes.frequencies.length}, Links: ${freqRes.links.length}`);
  console.log(`  Reimbursement Statuses: ${reimbRes.statuses.length}, Links: ${reimbRes.links.length}`);
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });