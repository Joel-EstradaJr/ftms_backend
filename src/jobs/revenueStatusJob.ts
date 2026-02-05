import cron from 'node-cron';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { generateCode } from '../utils/codeGenerator';
import { receivable_frequency } from '@prisma/client';

/**
 * Process revenue status updates (Core Logic)
 * Can be called by cron job or manually for testing
 * Returns a log string of what happened
 */
export async function processRevenueStatus(): Promise<string> {
    const logs: string[] = [];
    const log = (msg: string) => {
        // console.log(`[RevenueJob] ${msg}`); // Keep console.log for immediate feedback during development/testing
        logs.push(msg);
    };

    log('🔄 Starting revenue status check...');

    try {
        // 1. Fetch System Configuration
        const config = await prisma.system_configuration.findFirst({
            where: { is_active: true, is_deleted: false }
        });

        // Use defaults if config not found (fallback values from configModal.tsx)
        const durationToLateHours = config?.duration_to_receivable_hours || 168; // 7 days
        log(`Config: Duration to late = ${durationToLateHours} hours`); // Debug Log

        const receivableDueDateDays = config?.receivable_due_date_days || 30;
        const driverSharePercent = Number(config?.driver_share_percentage || 50);
        const conductorSharePercent = Number(config?.conductor_share_percentage || 50);
        const defaultFrequency = config?.default_frequency || 'WEEKLY';
        const defaultNumPayments = config?.default_number_of_payments || 3;

        const now = new Date();
        log(`Current Time: ${now.toISOString()}`);

        // 2. Auto-Convert PENDING Revenues to OVERDUE
        // Find revenues that are PENDING and past the grace period
        const pendingRevenues = await prisma.revenue.findMany({
            where: {
                payment_status: 'PENDING',
                is_deleted: false,
                bus_trip: {
                    isNot: null
                }
            },
            include: {
                bus_trip: true
            }
        });

        if (pendingRevenues.length === 0) {
            log('No PENDING revenues found to process.');
        } else {
            log(`Found ${pendingRevenues.length} PENDING revenues.`);
        }

        let convertedCount = 0;

        for (const revenue of pendingRevenues) {
            if (!revenue.bus_trip?.date_assigned) {
                log(`Skipping Revenue #${revenue.id}: No date_assigned for bus_trip_id ${revenue.bus_trip?.bus_trip_id}`);
                continue;
            }

            const dateAssigned = new Date(revenue.bus_trip.date_assigned);
            // dateAssigned is just the date part usually, we might need to be careful with timezones
            // but assuming standard Date object comparison works for now
            const lateTime = new Date(dateAssigned.getTime() + (durationToLateHours * 60 * 60 * 1000));

            const isOverdue = now > lateTime;
            log(`Checking Revenue #${revenue.id} (Bus Trip ID: ${revenue.bus_trip.bus_trip_id}): Assigned=${dateAssigned.toISOString()}, LateTime=${lateTime.toISOString()}, IsOverdue=${isOverdue}`);

            if (isOverdue) {
                // This revenue is overdue
                await prisma.$transaction(async (tx) => {
                    // A. Update Revenue Status
                    await tx.revenue.update({
                        where: { id: revenue.id },
                        data: {
                            payment_status: 'OVERDUE'
                        }
                    });


                    // B. Calculate Shortage & Shares
                    // For PENDING revenue, we assume amount_paid is likely 0 or very low, 
                    // but we rely on the existing calculation logic logic:
                    // expected - amount = shortage.
                    // However, we need to know the expected remittance.
                    // We duplicate the calculation logic here for safety or fetch it.
                    // Expected Remittance = (Revenue * AssignmentValue%) + Fuel  OR  AssignmentValue + Fuel

                    const trip = revenue.bus_trip!;
                    const tripRevenue = Number(trip.trip_revenue || 0);
                    const tripFuel = Number(trip.trip_fuel_expense || 0);
                    const assignmentValue = Number(trip.assignment_value || 0);

                    let expectedRemittance = 0;
                    if (trip.assignment_type === 'BOUNDARY') {
                        expectedRemittance = tripFuel + assignmentValue;
                    } else if (trip.assignment_type === 'PERCENTAGE') {
                        expectedRemittance = (tripRevenue * assignmentValue) + tripFuel;
                    } else {
                        expectedRemittance = tripFuel + assignmentValue; // Default
                    }

                    const amountPaid = Number(revenue.amount);
                    const shortage = expectedRemittance - amountPaid;

                    if (shortage > 0) {
                        // C. Create Receivables (if not exists)
                        // Check if receivables already exist linked to this revenue
                        if (!revenue.driver_receivable_id && !revenue.conductor_receivable_id) {

                            const driverAmount = shortage * (driverSharePercent / 100);
                            const conductorAmount = shortage * (conductorSharePercent / 100);

                            // Get Employees
                            const employees = await tx.bus_trip_employee_local.findMany({
                                where: {
                                    assignment_id: trip.assignment_id,
                                    bus_trip_id: trip.bus_trip_id
                                },
                                include: { employee: true }
                            });

                            const driver = employees.find(e => e.role === 'DRIVER');
                            const conductor = employees.find(e => e.role === 'CONDUCTOR');

                            const receivableDueDate = new Date(now.getTime() + (receivableDueDateDays * 24 * 60 * 60 * 1000));

                            // Helper to create receivable and installments
                            const createReceivableWithInstallments = async (
                                emp: any,
                                amount: number,
                                type: 'DRIVER' | 'CONDUCTOR'
                            ) => {
                                if (!emp || amount <= 0) return null;

                                const code = await generateCode('receivable');

                                const receivable = await tx.receivable.create({
                                    data: {
                                        code,
                                        debtor_name: `${emp.employee.first_name} ${emp.employee.last_name}`,
                                        employee_number: emp.employee_number,
                                        total_amount: amount,
                                        paid_amount: 0,
                                        balance: amount,
                                        status: 'PENDING', // Start as Pending, allow other job to mark overdue if needed
                                        due_date: receivableDueDate,
                                        frequency: defaultFrequency,
                                        number_of_payments: defaultNumPayments,
                                        created_by: 'SYSTEM'
                                    }
                                });

                                // Create Installments
                                const baseAmount = amount / defaultNumPayments;
                                let cumulative = 0;

                                for (let i = 1; i <= defaultNumPayments; i++) {
                                    let installmentDue = baseAmount;
                                    if (i === defaultNumPayments) {
                                        installmentDue = amount - cumulative;
                                    } else {
                                        cumulative += baseAmount;
                                    }

                                    // Calculate due date based on frequency
                                    const iDate = new Date(now);
                                    if (defaultFrequency === 'DAILY') iDate.setDate(iDate.getDate() + i);
                                    else if (defaultFrequency === 'WEEKLY') iDate.setDate(iDate.getDate() + (i * 7));
                                    else if (defaultFrequency === 'BIWEEKLY') iDate.setDate(iDate.getDate() + (i * 14));
                                    else if (defaultFrequency === 'MONTHLY') iDate.setMonth(iDate.getMonth() + i);

                                    await tx.revenue_installment_schedule.create({
                                        data: {
                                            receivable_id: receivable.id,
                                            installment_number: i,
                                            due_date: iDate,
                                            amount_due: installmentDue,
                                            amount_paid: 0,
                                            balance: installmentDue,
                                            status: 'PENDING',
                                            created_by: 'SYSTEM'
                                        }
                                    });
                                }
                                return receivable;
                            };

                            const driverReceivable = await createReceivableWithInstallments(driver, driverAmount, 'DRIVER');
                            const conductorReceivable = await createReceivableWithInstallments(conductor, conductorAmount, 'CONDUCTOR');

                            // Link back to revenue
                            await tx.revenue.update({
                                where: { id: revenue.id },
                                data: {
                                    driver_receivable_id: driverReceivable?.id,
                                    conductor_receivable_id: conductorReceivable?.id
                                }
                            });
                        }
                    }
                });

                log(`Converted Revenue #${revenue.id} to OVERDUE`);
                convertedCount++;
            }
        }

        if (convertedCount > 0) {
            log(`✅ Auto-converted ${convertedCount} pending revenues to OVERDUE`);
        }

        // 3. Update Overdue Installments
        const overdueInstallments = await prisma.revenue_installment_schedule.updateMany({
            where: {
                status: { notIn: ['PAID', 'OVERDUE'] },
                due_date: { lt: now },
                is_deleted: false
            },
            data: {
                status: 'OVERDUE'
            }
        });

        if (overdueInstallments.count > 0) {
            log(`Marked ${overdueInstallments.count} installments as OVERDUE`);
        }

        // 4. Update Overdue Receivables (if installments are overdue)
        // This is complex to do in one query, so we can fetch receivables with overdue installments
        const receivablesWithOverdueInstallments = await prisma.receivable.findMany({
            where: {
                status: { notIn: ['COMPLETED', 'OVERDUE'] },
                installment_schedule: {
                    some: {
                        status: 'OVERDUE'
                    }
                }
            }
        });

        for (const rec of receivablesWithOverdueInstallments) {
            await prisma.receivable.update({
                where: { id: rec.id },
                data: { status: 'OVERDUE' }
            });
        }

        // Also check pure due date of receivable
        const overdueReceivables = await prisma.receivable.updateMany({
            where: {
                status: { notIn: ['COMPLETED', 'OVERDUE'] },
                due_date: { lt: now },
                is_deleted: false
            },
            data: {
                status: 'OVERDUE'
            }
        });

        if (overdueReceivables.count > 0 || receivablesWithOverdueInstallments.length > 0) {
            log(`Marked receivables as OVERDUE`);
        }

    } catch (error: any) {
        log(`❌ Revenue status job failed: ${error.message}`);
        console.error(error);
    }

    return logs.join('\n');
}

/**
 * Initialize revenue status automated jobs
 */
let isJobRunning = false;

export function initRevenueStatusJob(): void {
    logger.info('📅 Initializing revenue status automation jobs...');

    /**
     * Real-time Revenue Status Update Job
     * Runs every minute to ensure immediate status updates
     */
    const revenueStatusJob = cron.schedule('* * * * *', async () => { // Runs every minute
        if (isJobRunning) {
            logger.warn('⚠️ Revenue status job is already running, skipping this cycle.');
            return;
        }

        isJobRunning = true;
        try {
            await processRevenueStatus();
        } finally {
            isJobRunning = false;
        }
    }, {
        timezone: 'Asia/Manila'
    });

    revenueStatusJob.start();
    logger.info('✅ Revenue status job scheduled: Real-time (Every Minute)');
}
