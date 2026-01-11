/**
 * APPROVAL SERVICE
 * Handles cash advance request approval workflow and EMS webhook integration
 */

import { PrismaClient } from '@prisma/client';
import axios from 'axios';

// Cast to any to work around IDE type caching after prisma generate
const prisma = new PrismaClient();

// EMS Gateway URL for sending status updates
const EMS_GATEWAY_URL = process.env.EMS_GATEWAY_URL || 'http://localhost:3000';

export interface CreateCashAdvanceDto {
    cashAdvanceRequestNumber: string;
    employeeNumber: string;  // Changed from employeeId
    amount: number;
    purpose?: string;
    repaymentMethod: string;
    repaymentFrequency?: string | null;
    numberOfRepaymentPeriods?: number | null;
    status: string;
    typeId?: number;
    priorityId?: number;
    employee?: {
        employeeNumber: string;  // Changed from id
        firstName: string;
        lastName: string;
        phone?: string | null;  // Added phone
        position?: {
            positionName: string;
            department?: {
                departmentName: string;
            };
        };
    };
    type?: { id: number; name: string };
    priority?: { id: number; name: string };
}

export interface UpdateStatusDto {
    status: 'APPROVED' | 'REJECTED';
    approvedAmount?: number;
    rejectionReason?: string;
    reviewedBy?: string;
    effectiveDate?: string;
    endDate?: string;
}

export class ApprovalService {
    /**
     * Receives and stores a cash advance request from EMS webhook
     */
    async receiveCashAdvance(dto: CreateCashAdvanceDto) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📥 INCOMING WEBHOOK FROM EMS - Cash Advance Request');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   Request Number: ${dto.cashAdvanceRequestNumber}`);
        console.log(`   Employee Number: ${dto.employeeNumber}`);
        console.log(`   Employee Name: ${dto.employee?.firstName} ${dto.employee?.lastName}`);
        console.log(`   Employee Phone: ${dto.employee?.phone || 'N/A'}`);
        console.log(`   Amount: ₱${dto.amount?.toLocaleString()}`);
        console.log(`   Purpose: ${dto.purpose}`);
        console.log(`   Repayment Method: ${dto.repaymentMethod}`);
        if (dto.repaymentFrequency) {
            console.log(`   Repayment Frequency: ${dto.repaymentFrequency}`);
            console.log(`   Number of Periods: ${dto.numberOfRepaymentPeriods}`);
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Check if request already exists
        const existing = await prisma.cash_advance_request.findUnique({
            where: { request_number: dto.cashAdvanceRequestNumber },
        });

        if (existing) {
            console.log(`⚠️ Cash advance ${dto.cashAdvanceRequestNumber} already exists, skipping.`);
            return { success: false, message: 'Cash advance request already exists', data: existing };
        }

        // Map repayment method
        const repaymentMethodMap: Record<string, string> = {
            'DEDUCTION_FROM_NEXT_PAYROLL': 'DEDUCTION_FROM_NEXT_PAYROLL',
            'DEDUCTION_OVER_PERIODS': 'DEDUCTION_OVER_PERIODS',
        };

        // Map repayment frequency
        const repaymentFrequencyMap: Record<string, string> = {
            'WEEKLY': 'WEEKLY',
            'BIWEEKLY': 'BIWEEKLY',
            'MONTHLY': 'MONTHLY',
        };

        const employeeName = dto.employee
            ? `${dto.employee.firstName} ${dto.employee.lastName}`.trim()
            : 'Unknown';
        const employeePosition = dto.employee?.position?.positionName || null;
        const employeeDepartment = dto.employee?.position?.department?.departmentName || null;

        const request = await prisma.cash_advance_request.create({
            data: {
                request_number: dto.cashAdvanceRequestNumber,
                employee_id: dto.employeeNumber,
                employee_name: employeeName,
                employee_position: employeePosition,
                employee_department: employeeDepartment,
                employee_phone: dto.employee?.phone || null,
                amount: dto.amount,
                purpose: dto.purpose,
                repayment_method: (repaymentMethodMap[dto.repaymentMethod] || 'DEDUCTION_FROM_NEXT_PAYROLL') as any,
                repayment_frequency: (dto.repaymentFrequency ? repaymentFrequencyMap[dto.repaymentFrequency] : null) as any,
                number_of_repayment_periods: dto.numberOfRepaymentPeriods,
                request_type_name: dto.type?.name || null,
                request_priority_name: dto.priority?.name || null,
                status: 'PENDING',
            },
        });

        console.log(`✅ Cash advance ${dto.cashAdvanceRequestNumber} saved to database with status PENDING`);

        return { success: true, message: 'Cash advance request received', data: request };
    }

    /**
     * Get all cash advance requests
     */
    async getAllCashAdvances(status?: string) {
        const where: any = { is_deleted: false };

        if (status) {
            where.status = status.toUpperCase();
        }

        const requests = await prisma.cash_advance_request.findMany({
            where,
            orderBy: { created_at: 'desc' },
        });

        return requests;
    }

    /**
     * Get a single cash advance request by ID
     */
    async getCashAdvanceById(id: number) {
        return prisma.cash_advance_request.findFirst({
            where: { id, is_deleted: false },
        });
    }

    /**
     * Get a single cash advance request by request number
     */
    async getCashAdvanceByNumber(requestNumber: string) {
        return prisma.cash_advance_request.findFirst({
            where: { request_number: requestNumber, is_deleted: false },
        });
    }

    /**
     * Update cash advance status and trigger webhook to EMS
     */
    async updateStatus(id: number, dto: UpdateStatusDto) {
        const request = await prisma.cash_advance_request.findFirst({
            where: { id, is_deleted: false },
        });

        if (!request) {
            throw new Error('Cash advance request not found');
        }

        if (request.status !== 'PENDING') {
            throw new Error(`Cannot update status. Current status is ${request.status}`);
        }

        // Update in database
        const updated = await prisma.cash_advance_request.update({
            where: { id },
            data: {
                status: dto.status as any,
                approved_amount: dto.status === 'APPROVED' ? dto.approvedAmount : null,
                rejection_reason: dto.status === 'REJECTED' ? dto.rejectionReason : null,
                reviewed_by: dto.reviewedBy,
                reviewed_at: new Date(),
            },
        });

        // Trigger webhook to EMS Gateway
        await this.sendStatusUpdateToEMS({
            cashAdvanceRequestNumber: request.request_number,
            status: dto.status,
            effectiveDate: dto.effectiveDate,
            endDate: dto.endDate,
            approvedAmount: dto.status === 'APPROVED' ? dto.approvedAmount : undefined,
            rejectionReason: dto.status === 'REJECTED' ? dto.rejectionReason : undefined,
        });

        console.log(`✅ Cash advance ${request.request_number} status updated to ${dto.status}`);

        return updated;
    }

    /**
     * Send status update webhook to EMS Gateway
     */
    private async sendStatusUpdateToEMS(payload: {
        cashAdvanceRequestNumber: string;
        status: string;
        effectiveDate?: string;
        endDate?: string;
        approvedAmount?: number;
        rejectionReason?: string;
    }) {
        const webhookUrl = `${EMS_GATEWAY_URL}/requests/cash-advance/webhook/finance/cash-advance/status`;

        try {
            const response = await axios.put(webhookUrl, payload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000,
            });

            console.log(`📤 Status update sent to EMS: ${payload.cashAdvanceRequestNumber} -> ${payload.status}`);
            return response.data;
        } catch (error: any) {
            console.error(`❌ Failed to send status update to EMS: ${error.message}`);
            // Don't throw - we don't want to fail the status update if webhook fails
            // The status is already updated in FTMS database
        }
    }

    /**
     * Update a cash advance request by its request number (webhook from EMS)
     */
    async updateByRequestNumber(requestNumber: string, data: {
        amount?: number;
        purpose?: string;
        repaymentMethod?: string;
        repaymentFrequency?: string;
        numberOfRepaymentPeriods?: number;
        remarks?: string;
    }) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📥 INCOMING UPDATE WEBHOOK FROM EMS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   Request Number: ${requestNumber}`);
        console.log(`   Update Data:`, JSON.stringify(data, null, 2));
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const existing = await (prisma as any).cash_advance_request.findFirst({
            where: { request_number: requestNumber },
        });

        if (!existing) {
            return { success: false, message: `Cash advance with request number ${requestNumber} not found` };
        }

        const updated = await (prisma as any).cash_advance_request.update({
            where: { id: existing.id },
            data: {
                ...(data.amount !== undefined && { amount: data.amount }),
                ...(data.purpose !== undefined && { purpose: data.purpose }),
                ...(data.repaymentMethod !== undefined && { repayment_method: data.repaymentMethod }),
                ...(data.repaymentFrequency !== undefined && { repayment_frequency: data.repaymentFrequency }),
                ...(data.numberOfRepaymentPeriods !== undefined && { number_of_repayment_periods: data.numberOfRepaymentPeriods }),
            },
        });

        console.log(`✅ Updated cash advance: ${requestNumber}`);
        return { success: true, data: updated };
    }

    /**
     * Delete a cash advance request by its request number (webhook from EMS)
     */
    async deleteByRequestNumber(requestNumber: string) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📥 INCOMING DELETE WEBHOOK FROM EMS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   Request Number: ${requestNumber}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const existing = await (prisma as any).cash_advance_request.findFirst({
            where: { request_number: requestNumber },
        });

        if (!existing) {
            return { success: false, message: `Cash advance with request number ${requestNumber} not found` };
        }

        await (prisma as any).cash_advance_request.delete({
            where: { id: existing.id },
        });

        console.log(`✅ Deleted cash advance: ${requestNumber}`);
        return { success: true, message: `Cash advance ${requestNumber} deleted successfully` };
    }
}

export default new ApprovalService();

