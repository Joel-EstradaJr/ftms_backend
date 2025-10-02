import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAssignmentById } from '@/lib/operations/assignments'
import { generateId } from '@/lib/idGenerator'
import type { NextRequest } from 'next/server'
import { logAudit } from '@/lib/auditLogger'
import { createRevenueFromBusTrip } from '@/lib/revenues/createFromBusTrip'
import { upsertBoundaryLoanForRevenue } from '@/lib/loans'
import { isValidCollectionDateForAdd, validateAmountAgainstTrip } from '@/app/utils/revenueCalc'
import { uploadToDrive } from '@/lib/google/drive'

export async function POST(req: NextRequest) {
  // Support both JSON and multipart/form-data with attachments
  const contentType = req.headers.get('content-type') || '';
  let data: any;
  const files: File[] = [];
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    // Extract known fields from form
    const jsonRaw = form.get('json');
    if (jsonRaw && typeof jsonRaw === 'string') {
      data = JSON.parse(jsonRaw);
    } else {
      // Fallback: build from individual fields
      data = Object.fromEntries(Array.from(form.entries()).filter(([k]) => k !== 'files'));
    }
    // Collect files
    for (const [key, val] of form.entries()) {
      if (key === 'files' && val instanceof File) files.push(val);
    }
  } else {
    data = await req.json();
  }
  const { assignment_id, bus_trip_id, category_id, total_amount, collection_date, created_by, payment_method_id, payment_status_id, remarks,
    is_receivable, due_date, payer_name, interest_rate, installments } = data as any;
  const { schedule_type } = data as any;
  const normalizedTotal =
    total_amount === undefined || total_amount === null
      ? undefined
      : typeof total_amount === 'number'
        ? total_amount
        : (typeof total_amount === 'string' ? Number(total_amount) : undefined);
  if (typeof normalizedTotal === 'number' && Number.isNaN(normalizedTotal)) {
    return NextResponse.json(
      { error: 'Invalid total_amount value' },
      { status: 400 }
    );
  }

  try {
    // Validate category exists and is linked to revenue module
    const category = await prisma.globalCategory.findUnique({ where: { id: category_id } });
    if (!category) return NextResponse.json({ error: 'Invalid category_id' }, { status: 400 });

    // Validate payment status is provided and allowed for revenue module
    if (!payment_status_id) return NextResponse.json({ error: 'payment_status_id is required' }, { status: 400 });
    const payStatus = await prisma.globalPaymentStatus.findUnique({ where: { id: payment_status_id } });
    if (!payStatus || !payStatus.applicable_modules.includes('revenue')) {
      return NextResponse.json({ error: 'Invalid payment_status_id for revenue' }, { status: 400 });
    }
    // Conditional required payment method when Paid
    let paymentMethodConnect: { connect: { id: string } } | undefined;
    if (/^paid$/i.test(payStatus.name)) {
      if (!payment_method_id) return NextResponse.json({ error: 'payment_method_id is required when status is Paid' }, { status: 400 });
      const pm = await prisma.globalPaymentMethod.findUnique({ where: { id: payment_method_id } });
      if (!pm) return NextResponse.json({ error: 'Invalid payment_method_id' }, { status: 400 });
      paymentMethodConnect = { connect: { id: payment_method_id } };
    } else if (payment_method_id) {
      const pm = await prisma.globalPaymentMethod.findUnique({ where: { id: payment_method_id } });
      if (!pm) return NextResponse.json({ error: 'Invalid payment_method_id' }, { status: 400 });
      paymentMethodConnect = { connect: { id: payment_method_id } };
    }

    // Validate remarks
    const trimmedRemarks = (remarks ?? '').toString().trim();
    if (trimmedRemarks.length < 5 || trimmedRemarks.length > 500) {
      return NextResponse.json({ error: 'Remarks must be 5-500 characters' }, { status: 400 });
    }

    // Validate AR fields
    const ar = Boolean(is_receivable);
    let dueDateValue: Date | null = null;
    let payerNameValue: string | null = null;
    const interestRateValue: number = Number(interest_rate ?? 0) || 0;
    if (ar) {
      if (!due_date) return NextResponse.json({ error: 'due_date is required when is_receivable is true' }, { status: 400 });
      if (!payer_name || String(payer_name).trim().length === 0) return NextResponse.json({ error: 'payer_name is required when is_receivable is true' }, { status: 400 });
      dueDateValue = new Date(due_date);
      payerNameValue = String(payer_name).trim();
      if (Number.isNaN(interestRateValue) || interestRateValue < 0) return NextResponse.json({ error: 'interest_rate must be a non-negative number' }, { status: 400 });
    }

    // If creating from BusTripID, delegate to helper aligned with Operations API
    if (bus_trip_id) {
      const created = await createRevenueFromBusTrip({
        bus_trip_id,
        created_by,
        collection_date: collection_date || undefined,
        override_amount: typeof normalizedTotal === 'number' ? normalizedTotal : undefined,
      });
      // attach payment/remarks updates if provided
      // resolve schedule_type_id if provided
      let scheduleTypeConnect: string | null = null;
      if (schedule_type) {
        const st = await (prisma as any).globalScheduleType.findFirst({ where: { name: { equals: String(schedule_type), mode: 'insensitive' }, is_deleted: false } });
        scheduleTypeConnect = st?.id || null;
      }
      const updated = await (prisma as any).revenueRecord.update({
        where: { revenue_id: created.revenue_id },
        data: {
          payment_status: { connect: { id: payment_status_id } },
          ...(paymentMethodConnect ? { payment_method: paymentMethodConnect.connect ? { connect: paymentMethodConnect.connect } : undefined } : {}),
          remarks: trimmedRemarks,
          is_receivable: ar,
          due_date: dueDateValue,
          payer_name: payerNameValue,
          interest_rate: interestRateValue,
          ...(ar ? { total_amount: 0 } : {}),
          ...(scheduleTypeConnect ? { schedule_type_id: scheduleTypeConnect } : {}),
        },
        include: { category: true, source: true, payment_method: true, payment_status: true } as any,
      });

      // Create installments if provided
      if (ar && Array.isArray(installments) && installments.length > 0) {
        const statusPending = await prisma.globalPaymentStatus.findFirst({ where: { name: { equals: 'Pending', mode: 'insensitive' }, applicable_modules: { has: 'revenue' } } });
        const instPending = await (prisma as any).globalInstallmentStatus.findFirst({ where: { name: { equals: 'Pending', mode: 'insensitive' }, is_deleted: false } });
        const recId = updated.revenue_id as string;
        let numberCounter = 1;
        for (const inst of installments) {
          const instDue = new Date(inst.due_date);
          const amtDue = Number(inst.amount_due);
          if (!instDue || Number.isNaN(amtDue) || amtDue <= 0) continue;
          await (prisma as any).revenueInstallment.create({
            data: {
              revenue_id: recId,
              installment_number: Number(inst.installment_number) || numberCounter,
              due_date: instDue,
              amount_due: amtDue,
              amount_paid: 0,
              payment_status_id: inst.payment_status_id || statusPending?.id || (payStatus.id as string),
              payment_method_id: inst.payment_method_id || null,
              paid_date: null,
              installment_status_id: inst.installment_status_id || instPending?.id || null,
            }
          });
          numberCounter += 1;
        }
      }

      // Transactional attachments (optional)
      if (files.length > 0) {
        const createdAtt: any[] = [];
        try {
          const ALLOWED_EXT = ['.png','.jpg','.jpeg','.jfif','.pdf','.docx','.csv','.xlsx'];
          const ALLOWED_MIME = new Set(['image/png','image/jpeg','image/jpg','image/pjpeg','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
          const MAX_TOTAL = 50 * 1024 * 1024;
          const existing = await (prisma as any).attachment.findMany({ where: { module_name: 'revenue', record_id: updated.revenue_id, is_deleted: false } });
          const totalExisting = existing.reduce((s: number, a: any) => s + (a.size_bytes || 0), 0);
          let batchSize = 0;
          for (const f of files) {
            const ext = (f.name.split('.').pop() || '').toLowerCase();
            const dotExt = `.${ext}`;
            if (!ALLOWED_EXT.includes(dotExt)) return NextResponse.json({ error: `Unsupported file type: ${dotExt}` }, { status: 400 });
            if (!ALLOWED_MIME.has(f.type)) return NextResponse.json({ error: `Unsupported MIME type: ${f.type}` }, { status: 400 });
            batchSize += f.size;
          }
          if (totalExisting + batchSize > MAX_TOTAL) return NextResponse.json({ error: 'Total attachments exceed 50MB per revenue' }, { status: 400 });

          for (const f of files) {
            const arrayBuffer = await f.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const cleanName = f.name.replace(/[^\/\w\.-]/g, '_');
            const uploaded = await uploadToDrive({ name: cleanName, mimeType: f.type, buffer });
            const att = await (prisma as any).attachment.create({
              data: {
                module_name: 'revenue',
                record_id: updated.revenue_id,
                file_id: uploaded.fileId,
                original_name: f.name,
                mime_type: f.type,
                size_bytes: f.size,
                path: null,
              }
            });
            createdAtt.push(att);
          }
        } catch (e) {
          // Rollback created attachments on failure
          if (createdAtt.length > 0) {
            const ids = createdAtt.map(a => a.id);
            await (prisma as any).attachment.deleteMany({ where: { id: { in: ids } } });
          }
          return NextResponse.json({ error: 'Failed to upload attachments' }, { status: 500 });
        }
      }
      return NextResponse.json(updated);
    }

    if (typeof normalizedTotal !== 'number' || Number.isNaN(normalizedTotal)) {
      return NextResponse.json(
        { error: 'total_amount is required and must be a valid number' },
        { status: 400 }
      );
    }
    const finalAmount = normalizedTotal as number;
    let assignmentData = null;

    // Convert collection_date string to Date object for comparison and storage, default to today
    const collectionDateTime = collection_date ? new Date(collection_date) : new Date();
    // Validate date range (within 3 months before now and not in future)
    if (!isValidCollectionDateForAdd(collectionDateTime)) {
      return NextResponse.json({ error: 'Collection date must be within 3 months before today and not in the future.' }, { status: 400 });
    }

    // --- ANTI-DUPLICATE LOGIC ---
    if (assignment_id) {
      // Check for duplicate revenue record for the same assignment and collection_date (with time precision)
      const duplicate = await prisma.revenueRecord.findFirst({
        where: {
          assignment_id,
          collection_date: collectionDateTime,
          category_id,
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: 'Revenue record for this assignment and collection date/time already exists.' },
          { status: 409 }
        );
      }
      assignmentData = await getAssignmentById(assignment_id);
      if (!assignmentData) {
        return NextResponse.json(
          { error: 'Assignment not found in Operations API' },
          { status: 404 }
        );
      }
      // For BusTrip-linked categories, ensure category matches assignment type and enforce amount cap
      const normalizedCat = (category.name || '').replace(/_/g, ' ').trim().toLowerCase();
      if (['boundary', 'percentage', 'bus rental'].includes(normalizedCat)) {
        if ((assignmentData.assignment_type || '').toLowerCase() !== normalizedCat) {
          return NextResponse.json({ error: 'Selected category must match BusTrip assignment_type' }, { status: 400 });
        }
        const tripRev = Number(assignmentData.trip_revenue) || 0;
        if (!validateAmountAgainstTrip(category.name, finalAmount, tripRev)) {
          return NextResponse.json({ error: `total_amount must be between 1 and ${tripRev}` }, { status: 400 });
        }
      }
    } else {
      // For non-assignment revenues, check for duplicate by category, amount, and exact datetime
      const duplicate = await prisma.revenueRecord.findFirst({
        where: {
          category_id,
          total_amount: finalAmount,
          collection_date: collectionDateTime,
        },
      });
      if (duplicate) {
        return NextResponse.json(
          { error: 'Revenue record for this category, amount and collection date/time already exists.' },
          { status: 409 }
        );
      }
    }

    // resolve schedule_type_id if provided
    let scheduleTypeId: string | null = null;
    if (schedule_type) {
      const st = await (prisma as any).globalScheduleType.findFirst({ where: { name: { equals: String(schedule_type), mode: 'insensitive' }, is_deleted: false } });
      scheduleTypeId = st?.id || null;
    }

    const newRevenue = await (prisma as any).revenueRecord.create({
      data: {
        revenue_id: await generateId('REV'),
        assignment_id: assignment_id ?? null,
        bus_trip_id: assignmentData?.bus_trip_id ?? null,
        category_id,
  // no source_ref in schema; omit source and source_id unless linking an existing GlobalSource via nested connect
        total_amount: ar ? 0 : finalAmount,
        collection_date: collectionDateTime,
        created_by,
        payment_status: { connect: { id: payment_status_id } },
        ...(paymentMethodConnect ? { payment_method: { connect: { id: payment_method_id! } } } : {}),
        remarks: trimmedRemarks,
        is_receivable: ar,
        due_date: dueDateValue,
        payer_name: payerNameValue,
        interest_rate: interestRateValue,
        ...(scheduleTypeId ? { schedule_type_id: scheduleTypeId } : {}),
      },
      include: {
        category: true,
        source: true,
        payment_method: true,
        payment_status: true,
      }
    });

    // Create installments if provided
    if (ar && Array.isArray(installments) && installments.length > 0) {
      const statusPending = await prisma.globalPaymentStatus.findFirst({ where: { name: { equals: 'Pending', mode: 'insensitive' }, applicable_modules: { has: 'revenue' } } });
      const instPending = await (prisma as any).globalInstallmentStatus.findFirst({ where: { name: { equals: 'Pending', mode: 'insensitive' }, is_deleted: false } });
      let numberCounter = 1;
      for (const inst of installments) {
        const instDue = new Date(inst.due_date);
        const amtDue = Number(inst.amount_due);
        if (!instDue || Number.isNaN(amtDue) || amtDue <= 0) continue;
  await (prisma as any).revenueInstallment.create({
          data: {
            revenue_id: (newRevenue as any).revenue_id,
            installment_number: Number(inst.installment_number) || numberCounter,
            due_date: instDue,
            amount_due: amtDue,
            amount_paid: 0,
            payment_status_id: inst.payment_status_id || statusPending?.id || (payStatus.id as string),
            payment_method_id: inst.payment_method_id || null,
            paid_date: null,
            installment_status_id: inst.installment_status_id || instPending?.id || null,
          }
        });
        numberCounter += 1;
      }
    }

    // Option 2 Loan: apply for Boundary category when quota not met
    try {
  const categoryName = (newRevenue as any).category?.name || '';
      if (assignmentData && /boundary/i.test(categoryName)) {
        const assignment_value = Number(assignmentData.assignment_value) || 0;
        const trip_revenue = Number(assignmentData.trip_revenue) || 0;
        const loanCalc = await upsertBoundaryLoanForRevenue({
          revenue_id: newRevenue.revenue_id,
          assignment_value,
          trip_revenue,
          total_amount: finalAmount,
        });
        console.log('[POST][Revenue] Boundary Option2 loan:', loanCalc);
      }
    } catch (e) {
      console.warn('Loan upsert failed (non-fatal):', e);
    }

    await logAudit({
      action: 'CREATE',
      table_affected: 'RevenueRecord',
      record_id: newRevenue.revenue_id,
      performed_by: created_by,
      details: `Created revenue record with amount ₱${finalAmount} for ${collectionDateTime.toISOString()}`,
    });

    // If multipart attachments provided, upload and create atomically (best-effort rollback)
    if (files.length > 0) {
      const createdAtt: any[] = [];
      try {
        const ALLOWED_EXT = ['.png','.jpg','.jpeg','.jfif','.pdf','.docx','.csv','.xlsx'];
        const ALLOWED_MIME = new Set(['image/png','image/jpeg','image/jpg','image/pjpeg','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
        const MAX_TOTAL = 50 * 1024 * 1024;
        const existing = await (prisma as any).attachment.findMany({ where: { module_name: 'revenue', record_id: (newRevenue as any).revenue_id, is_deleted: false } });
        const totalExisting = existing.reduce((s: number, a: any) => s + (a.size_bytes || 0), 0);
        let batchSize = 0;
        for (const f of files) {
          const ext = (f.name.split('.').pop() || '').toLowerCase();
          const dotExt = `.${ext}`;
          if (!ALLOWED_EXT.includes(dotExt)) return NextResponse.json({ error: `Unsupported file type: ${dotExt}` }, { status: 400 });
          if (!ALLOWED_MIME.has(f.type)) return NextResponse.json({ error: `Unsupported MIME type: ${f.type}` }, { status: 400 });
          batchSize += f.size;
        }
        if (totalExisting + batchSize > MAX_TOTAL) return NextResponse.json({ error: 'Total attachments exceed 50MB per revenue' }, { status: 400 });

        for (const f of files) {
          const arrayBuffer = await f.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const cleanName = f.name.replace(/[^\/\w\.-]/g, '_');
          const uploaded = await uploadToDrive({ name: cleanName, mimeType: f.type, buffer });
          const att = await (prisma as any).attachment.create({
            data: {
              module_name: 'revenue',
              record_id: (newRevenue as any).revenue_id,
              file_id: uploaded.fileId,
              original_name: f.name,
              mime_type: f.type,
              size_bytes: f.size,
              path: null,
            }
          });
          createdAtt.push(att);
        }
      } catch (e) {
        // If attachment upload fails, delete the revenue and any created attachments
        try {
          if (createdAtt.length > 0) {
            const ids = createdAtt.map(a => a.id);
            await (prisma as any).attachment.deleteMany({ where: { id: { in: ids } } });
          }
          await (prisma as any).revenueRecord.delete({ where: { revenue_id: (newRevenue as any).revenue_id } });
        } catch {}
        return NextResponse.json({ error: 'Failed to upload attachments' }, { status: 500 });
      }
    }

    return NextResponse.json(newRevenue);
  } catch (error) {
    console.error('Failed to create revenue:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Internal Server Error', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const dateFilter = searchParams.get('dateFilter');
  const dateFrom = searchParams.get('dateFrom');
  const dateTo = searchParams.get('dateTo');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));

  let dateCondition = {};

  if (dateFilter) {
    const now = new Date();
    switch (dateFilter) {
      case 'Day':
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        dateCondition = {
          collection_date: {
            gte: startOfDay,
            lt: endOfDay
          }
        };
        break;
      case 'Month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        dateCondition = {
          collection_date: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        };
        break;
      case 'Year':
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        dateCondition = {
          collection_date: {
            gte: startOfYear,
            lte: endOfYear
          }
        };
        break;
    }
  } else if (dateFrom && dateTo) {
    // Convert date strings to full datetime range
    const fromDateTime = new Date(dateFrom);
    fromDateTime.setHours(0, 0, 0, 0);
    
    const toDateTime = new Date(dateTo);
    toDateTime.setHours(23, 59, 59, 999);
    
    dateCondition = {
      collection_date: {
        gte: fromDateTime,
        lte: toDateTime
      }
    };
  }

  const where = { 
    is_deleted: false,
    ...(dateCondition as Record<string, unknown>),
  };

  const total = await prisma.revenueRecord.count({ where });
  const revenues = await (prisma as any).revenueRecord.findMany({ 
    where,
    include: {
      category: true,
      source: true,
      payment_method: true,
      payment_status: true,
      // include FK-based schedule type for friendly name
      scheduleType: true,
      installments: {
        include: { payment_status: true, payment_method: true, installmentStatus: true },
        orderBy: { installment_number: 'asc' }
      },
    },
    orderBy: { created_at: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  // Attach generic attachments for each revenue
  const revenueIds = revenues.map((r: any) => r.revenue_id);
  const attachments = await (prisma as any).attachment.findMany({
    where: { module_name: 'revenue', record_id: { in: revenueIds }, is_deleted: false },
    orderBy: { uploaded_at: 'desc' },
  });
  const attachmentsByRecord: Record<string, any[]> = {};
  for (const att of attachments) {
    const key = att.record_id;
    if (!attachmentsByRecord[key]) attachmentsByRecord[key] = [];
    attachmentsByRecord[key].push(att);
  }
  const enriched = revenues.map((r: any) => ({
    ...r,
    // friendly name from GlobalScheduleType fallback to legacy enum column during transition
    schedule_type_name: r?.scheduleType?.name ?? r?.schedule_type ?? null,
    // add friendly names for each installment's status
    installments: Array.isArray(r?.installments)
      ? r.installments.map((inst: any) => ({
          ...inst,
          installment_status_name: inst?.installmentStatus?.name ?? inst?.status ?? null,
        }))
      : r?.installments,
    attachments: attachmentsByRecord[r.revenue_id] || [],
    attachment_count: (attachmentsByRecord[r.revenue_id] || []).length,
  }));
  
  const res = NextResponse.json(enriched);
  res.headers.set('X-Total-Count', String(total));
  res.headers.set('X-Page', String(page));
  res.headers.set('X-Limit', String(limit));
  res.headers.set('X-Total-Pages', String(Math.max(1, Math.ceil(total / limit))));
  return res;
}