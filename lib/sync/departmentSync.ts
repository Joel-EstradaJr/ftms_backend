/**
 * DEPARTMENT SYNC SERVICE
 * 
 * Handles synchronization of department data from HR external API
 * External API: env(EXTERNAL_DEPARTMENT_API_URL)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================================
// EXTERNAL PAYLOAD INTERFACE
// ============================================================================

/**
 * Department payload from HR System
 * Endpoint: ${EXTERNAL_DEPARTMENT_API_URL}
 */
interface ExternalDepartmentPayload {
    id: number;
    departmentName: string;
}

// ============================================================================
// SYNC RESULT INTERFACE
// ============================================================================

interface DepartmentSyncResult {
    success: boolean;
    inserted: number;
    updated: number;
    softDeleted: number;
    errors: string[];
    duration: number;
}

// ============================================================================
// SYNC FUNCTION
// ============================================================================

/**
 * Fetch departments from external HR API and sync to department_local
 */
export async function syncDepartments(): Promise<DepartmentSyncResult> {
    const startTime = Date.now();
    const result: DepartmentSyncResult = {
        success: false,
        inserted: 0,
        updated: 0,
        softDeleted: 0,
        errors: [],
        duration: 0,
    };

    const apiUrl = process.env.EXTERNAL_DEPARTMENT_API_URL;

    if (!apiUrl) {
        result.errors.push('EXTERNAL_DEPARTMENT_API_URL environment variable is not set');
        result.duration = Date.now() - startTime;
        console.error('[SYNC] Department sync failed: Missing API URL');
        return result;
    }

    try {
        console.log(`[SYNC] Fetching departments from: ${apiUrl}`);

        const response = await fetch(apiUrl, {
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const departments = (await response.json()) as ExternalDepartmentPayload[];
        console.log(`[SYNC] Received ${departments.length} departments from API`);

        if (!Array.isArray(departments)) {
            throw new Error('Invalid response format: expected array of departments');
        }

        const fetchedIds = new Set(departments.map(d => d.id));

        await prisma.$transaction(async (tx) => {
            // Get existing records
            const existingRecords = await tx.department_local.findMany({
                select: { id: true, is_active: true },
            });
            const existingMap = new Map(existingRecords.map(r => [r.id, r]));

            // Upsert each department
            for (const dept of departments) {
                const existing = existingMap.get(dept.id);
                const isExisting = !!existing;

                await tx.department_local.upsert({
                    where: { id: dept.id },
                    update: {
                        department_name: dept.departmentName,
                        is_active: true,
                        is_deleted: false,
                        last_synced_at: new Date(),
                    },
                    create: {
                        id: dept.id,
                        department_name: dept.departmentName,
                        is_active: true,
                        is_deleted: false,
                        last_synced_at: new Date(),
                    },
                });

                if (isExisting) {
                    result.updated++;
                } else {
                    result.inserted++;
                }
            }

            // Soft delete records not in payload
            const idsToSoftDelete = [...existingMap.keys()].filter(id => !fetchedIds.has(id));
            if (idsToSoftDelete.length > 0) {
                await tx.department_local.updateMany({
                    where: {
                        id: { in: idsToSoftDelete },
                        is_deleted: false,
                    },
                    data: {
                        is_deleted: true,
                        last_synced_at: new Date(),
                    },
                });
                result.softDeleted = idsToSoftDelete.length;
            }
        });

        result.success = true;
        console.log(`[SYNC] department_local: ${result.inserted} inserted, ${result.updated} updated, ${result.softDeleted} soft deleted`);
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.errors.push(errorMsg);
        console.error('[SYNC] Error syncing departments:', errorMsg);
    }

    result.duration = Date.now() - startTime;
    return result;
}

/**
 * Get all active departments from local database
 */
export async function getActiveDepartments() {
    return prisma.department_local.findMany({
        where: {
            is_active: true,
            is_deleted: false,
        },
        orderBy: { department_name: 'asc' },
    });
}

export type { ExternalDepartmentPayload, DepartmentSyncResult };
