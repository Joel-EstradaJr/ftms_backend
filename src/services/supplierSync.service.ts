/**
 * Supplier Sync Service
 * Handles synchronization of suppliers from Inventory API
 * and manages vendor creation/linking logic
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { config } from '../config/env';

const prisma = new PrismaClient();

// Supplier payload from Inventory API
interface InventorySupplier {
    id: number;
    supplier_id: string;      // External code like "SUP-001"
    supplier_name: string;
    contact_number?: string;
    email?: string;
    street?: string;
    barangay?: string;
    city?: string;
    province?: string;
    status?: string;
    remarks?: string;
    date_created?: string;
    date_updated?: string;
    isdeleted?: boolean;
    itemCount?: number;
}

// Vendor response for dropdown
interface VendorListItem {
    id: number;
    code: string;
    name: string;
    isSupplier: boolean;
    supplier_local_id: number | null;
}

export class SupplierSyncService {
    /**
     * Fetch suppliers from Inventory API
     */
    async fetchFromInventory(): Promise<InventorySupplier[]> {
        const baseUrl = config.INV_API_BASE_URL;
        const endpoint = config.INV_SUPPLIER_ENDPOINT;

        if (!baseUrl || !endpoint) {
            throw new Error('Inventory API configuration missing: INV_API_BASE_URL or INV_SUPPLIER_ENDPOINT');
        }

        const url = `${baseUrl}${endpoint}`;
        console.log(`[SupplierSync] Fetching suppliers from: ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch suppliers: ${response.status} ${response.statusText}`);
        }

        const result = (await response.json()) as { data?: any[]; suppliers?: any[] };

        // Handle different response formats
        const suppliers = result.data || result.suppliers || (Array.isArray(result) ? result : []);
        console.log(`[SupplierSync] Received ${suppliers.length} suppliers from Inventory`);

        return suppliers;
    }

    /**
     * Validate name uniqueness across vendor and supplier tables
     */
    async validateNameUniqueness(name: string, excludeSupplierId?: number, excludeVendorId?: number): Promise<boolean> {
        // Check in supplier_local
        const existingSupplier = await prisma.supplier_local.findFirst({
            where: {
                supplier_name: name,
                is_deleted: false,
                ...(excludeSupplierId && { NOT: { id: excludeSupplierId } }),
            },
        });

        if (existingSupplier) {
            return false;
        }

        // Check in vendor (for standalone vendors)
        const existingVendor = await prisma.vendor.findFirst({
            where: {
                name: name,
                is_deleted: false,
                supplier_local_id: null, // Only check standalone vendors
                ...(excludeVendorId && { NOT: { id: excludeVendorId } }),
            },
        });

        return !existingVendor;
    }

    /**
     * Generate unique vendor code for non-supplier vendors
     */
    async generateVendorCode(): Promise<string> {
        const lastVendor = await prisma.vendor.findFirst({
            where: {
                code: { startsWith: 'VDR-' },
            },
            orderBy: { id: 'desc' },
            select: { id: true },
        });

        const nextNum = (lastVendor?.id || 0) + 1;
        return `VDR-${nextNum.toString().padStart(5, '0')}`;
    }

    /**
     * Sync a single supplier from Inventory and create/link vendor
     */
    async syncSupplier(supplierData: InventorySupplier): Promise<{ supplier_local_id: number; vendor_id: number }> {
        return await prisma.$transaction(async (tx) => {
            // Upsert supplier_local
            const supplierLocal = await tx.supplier_local.upsert({
                where: { supplier_id: supplierData.supplier_id },
                create: {
                    supplier_id: supplierData.supplier_id,
                    supplier_name: supplierData.supplier_name,
                    contact_number: supplierData.contact_number,
                    email: supplierData.email,
                    street: supplierData.street,
                    barangay: supplierData.barangay,
                    city: supplierData.city,
                    province: supplierData.province,
                    status: supplierData.status || 'ACTIVE',
                    remarks: supplierData.remarks,
                    date_created: supplierData.date_created ? new Date(supplierData.date_created) : null,
                    date_updated: supplierData.date_updated ? new Date(supplierData.date_updated) : null,
                    item_count: supplierData.itemCount,
                    is_active: !supplierData.isdeleted,
                    is_deleted: false,
                    last_synced_at: new Date(),
                },
                update: {
                    supplier_name: supplierData.supplier_name,
                    contact_number: supplierData.contact_number,
                    email: supplierData.email,
                    street: supplierData.street,
                    barangay: supplierData.barangay,
                    city: supplierData.city,
                    province: supplierData.province,
                    status: supplierData.status || 'ACTIVE',
                    remarks: supplierData.remarks,
                    date_created: supplierData.date_created ? new Date(supplierData.date_created) : null,
                    date_updated: supplierData.date_updated ? new Date(supplierData.date_updated) : null,
                    item_count: supplierData.itemCount,
                    is_active: !supplierData.isdeleted,
                    last_synced_at: new Date(),
                },
            });

            // Check if vendor already linked
            let vendor = await tx.vendor.findFirst({
                where: { supplier_local_id: supplierLocal.id },
            });

            if (!vendor) {
                // Create new vendor linked to supplier
                // Note: code and name are NULL for supplier-linked vendors
                vendor = await tx.vendor.create({
                    data: {
                        supplier_local_id: supplierLocal.id,
                        is_active: !supplierData.isdeleted,
                        created_by: 'system-sync',
                    },
                });
            } else {
                // Update vendor active status
                await tx.vendor.update({
                    where: { id: vendor.id },
                    data: { is_active: !supplierData.isdeleted },
                });
            }

            return {
                supplier_local_id: supplierLocal.id,
                vendor_id: vendor.id,
            };
        });
    }

    /**
     * Full sync from Inventory API
     */
    async syncFromInventory(): Promise<{ synced: number; errors: string[] }> {
        const suppliers = await this.fetchFromInventory();
        const errors: string[] = [];
        let synced = 0;

        for (const supplier of suppliers) {
            try {
                await this.syncSupplier(supplier);
                synced++;
            } catch (error: any) {
                errors.push(`Failed to sync ${supplier.supplier_id}: ${error.message}`);
                console.error(`[SupplierSync] Error syncing ${supplier.supplier_id}:`, error);
            }
        }

        console.log(`[SupplierSync] Completed: ${synced} synced, ${errors.length} errors`);
        return { synced, errors };
    }

    /**
     * Handle webhook from Inventory (create/update supplier)
     */
    async handleWebhook(payload: InventorySupplier): Promise<{ supplier_local_id: number; vendor_id: number }> {
        // Validate name uniqueness (check if a standalone vendor has this name)
        const existingVendor = await prisma.vendor.findFirst({
            where: {
                name: payload.supplier_name,
                supplier_local_id: null, // Standalone vendor
                is_deleted: false,
            },
        });

        if (existingVendor) {
            throw new Error(`Name "${payload.supplier_name}" already exists as a standalone vendor`);
        }

        return this.syncSupplier(payload);
    }

    /**
     * Create a standalone vendor (not linked to supplier)
     */
    async createStandaloneVendor(name: string, createdBy: string): Promise<{ id: number; code: string; name: string }> {
        // Validate name uniqueness
        const isUnique = await this.validateNameUniqueness(name);
        if (!isUnique) {
            throw new Error(`Name "${name}" already exists as a vendor or supplier`);
        }

        const code = await this.generateVendorCode();

        const vendor = await prisma.vendor.create({
            data: {
                code,
                name,
                supplier_local_id: null,
                is_active: true,
                created_by: createdBy,
            },
        });

        return {
            id: vendor.id,
            code: vendor.code!,
            name: vendor.name!,
        };
    }

    /**
     * Get unified vendor list for dropdown
     * Returns both supplier-linked and standalone vendors
     */
    async getVendorList(): Promise<VendorListItem[]> {
        const vendors = await prisma.vendor.findMany({
            where: {
                is_active: true,
                is_deleted: false,
            },
            include: {
                supplier_local: true,
            },
            orderBy: [
                { supplier_local_id: 'asc' }, // Suppliers first
                { name: 'asc' },
            ],
        });

        return vendors.map((v) => ({
            id: v.id,
            code: v.supplier_local?.supplier_id || v.code || `VDR-${v.id}`,
            name: v.supplier_local?.supplier_name || v.name || 'Unknown',
            isSupplier: v.supplier_local_id !== null,
            supplier_local_id: v.supplier_local_id,
        }));
    }

    /**
     * Get all suppliers (for listing)
     */
    async getSuppliers() {
        return prisma.supplier_local.findMany({
            where: { is_deleted: false },
            include: { vendor: true },
            orderBy: { supplier_name: 'asc' },
        });
    }
}

export const supplierSyncService = new SupplierSyncService();
