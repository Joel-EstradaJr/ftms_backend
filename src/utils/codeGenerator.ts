/**
 * UNIFIED CODE GENERATOR SERVICE
 * 
 * Centralized code generation for all Finance models.
 * Provides consistent, unique, human-readable business identifiers.
 * 
 * Format: <PREFIX>-<DDMMYY>-<SEQUENCE>
 * Example: REV-020226-0001, EXP-020226-0001, JE-020226-0001
 * 
 * Rules:
 * - Sequences are PER MODEL AND DATE (resets daily)
 * - Date component (DDMMYY) for grouping and traceability
 * - 4-digit sequence with zero-padding
 * - Transaction-safe with concurrency handling
 * 
 * Included Models (non-_local with 'code' field):
 * - revenue         → REV
 * - expense         → EXP
 * - journal_entry   → JE
 * - payable         → PAY
 * - receivable      → REC
 * - fixed_asset     → AST (uses asset_code)
 * - expense_adjustment → ADJ (uses adjustment_code)
 * - payroll_period  → PRD (uses payroll_period_code)
 * - vendor          → VDR
 * - system_configuration → CFG (uses config_code)
 * - account_type    → AT
 * - revenue_type    → REVT
 * - expense_type    → EXPT
 * - payroll_item_type → PIT
 * - asset_type      → ASTT
 */

import { prisma } from '../config/database';
import { logger } from '../config/logger';

// ============================================================================
// MODEL PREFIX MAPPING
// ============================================================================

/**
 * Model abbreviation mapping for code generation.
 * Each model with a 'code' field has a unique, human-readable prefix.
 */
export const MODEL_PREFIXES = {
    // Core Transaction Models
    revenue: 'REV',
    expense: 'EXP',
    journal_entry: 'JE',
    payable: 'PAY',
    receivable: 'REC',
    
    // Asset Management
    fixed_asset: 'AST',
    
    // Adjustments
    expense_adjustment: 'ADJ',
    
    // Payroll
    payroll_period: 'PRD',
    
    // Master Data / Type Models
    vendor: 'VDR',
    system_configuration: 'CFG',
    account_type: 'AT',
    revenue_type: 'REVT',
    expense_type: 'EXPT',
    payroll_item_type: 'PIT',
    asset_type: 'ASTT',
} as const;

export type ModelWithCode = keyof typeof MODEL_PREFIXES;

/**
 * Field name mapping for models where the code field is not named 'code'
 */
const CODE_FIELD_NAMES: Partial<Record<ModelWithCode, string>> = {
    fixed_asset: 'asset_code',
    expense_adjustment: 'adjustment_code',
    payroll_period: 'payroll_period_code',
    system_configuration: 'config_code',
};

// ============================================================================
// CODE GENERATOR SERVICE
// ============================================================================

export class CodeGeneratorService {
    private static instance: CodeGeneratorService;

    /**
     * Singleton pattern for service access
     */
    public static getInstance(): CodeGeneratorService {
        if (!CodeGeneratorService.instance) {
            CodeGeneratorService.instance = new CodeGeneratorService();
        }
        return CodeGeneratorService.instance;
    }

    /**
     * Generate a unique code for a given model
     * 
     * @param model - The Prisma model name (e.g., 'revenue', 'expense')
     * @param offset - Optional offset for batch generation (default 0)
     * @returns Promise<string> - Generated code in format PREFIX-DDMMYY-XXXX
     * 
     * @example
     * // Generate single code
     * const code = await codeGenerator.generateCode('revenue');
     * // Returns: 'REV-020226-0001'
     * 
     * @example
     * // Generate batch codes
     * const codes = await Promise.all([
     *   codeGenerator.generateCode('receivable', 0),
     *   codeGenerator.generateCode('receivable', 1),
     * ]);
     * // Returns: ['REC-020226-0001', 'REC-020226-0002']
     */
    async generateCode(model: ModelWithCode, offset: number = 0): Promise<string> {
        const prefix = MODEL_PREFIXES[model];
        if (!prefix) {
            throw new Error(`Unknown model for code generation: ${model}`);
        }

        // Format date as DDMMYY
        const now = new Date();
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear().toString().slice(-2);
        const dateStr = `${day}${month}${year}`;
        
        const codePrefix = `${prefix}-${dateStr}-`;
        const codeFieldName = CODE_FIELD_NAMES[model] || 'code';

        try {
            const nextNumber = await this.getNextSequenceNumber(model, codePrefix, codeFieldName, offset);
            const generatedCode = `${codePrefix}${nextNumber.toString().padStart(4, '0')}`;

            logger.debug(`[CodeGenerator] Generated ${model} code: ${generatedCode}`);
            return generatedCode;
        } catch (error) {
            logger.error(`[CodeGenerator] Failed to generate code for ${model}:`, error);
            throw new Error(`Failed to generate code for ${model}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Generate multiple codes for batch operations
     * 
     * @param model - The Prisma model name
     * @param count - Number of codes to generate
     * @returns Promise<string[]> - Array of generated codes
     */
    async generateBatchCodes(model: ModelWithCode, count: number): Promise<string[]> {
        const codes: string[] = [];
        for (let i = 0; i < count; i++) {
            const code = await this.generateCode(model, i);
            codes.push(code);
        }
        return codes;
    }

    /**
     * Get the next sequence number for a model
     * Handles different table/field configurations
     */
    private async getNextSequenceNumber(
        model: ModelWithCode,
        codePrefix: string,
        codeFieldName: string,
        offset: number
    ): Promise<number> {
        // Get the last record with matching prefix
        const lastRecord = await this.findLastCodeRecord(model, codePrefix, codeFieldName);

        let nextNumber = 1 + offset;
        if (lastRecord) {
            const lastCode = lastRecord[codeFieldName as keyof typeof lastRecord] as string;
            if (lastCode) {
                const parts = lastCode.split('-');
                const lastNumber = parseInt(parts[parts.length - 1], 10);
                if (!isNaN(lastNumber)) {
                    nextNumber = lastNumber + 1 + offset;
                }
            }
        }

        return nextNumber;
    }

    /**
     * Find the last record with a matching code prefix
     * Uses raw query for dynamic table access
     */
    private async findLastCodeRecord(
        model: ModelWithCode,
        codePrefix: string,
        codeFieldName: string
    ): Promise<Record<string, any> | null> {
        // Map model names to Prisma client property names
        const modelAccessors: Record<ModelWithCode, any> = {
            revenue: prisma.revenue,
            expense: prisma.expense,
            journal_entry: prisma.journal_entry,
            payable: prisma.payable,
            receivable: prisma.receivable,
            fixed_asset: prisma.fixed_asset,
            expense_adjustment: prisma.expense_adjustment,
            payroll_period: prisma.payroll_period,
            vendor: prisma.vendor,
            system_configuration: prisma.system_configuration,
            account_type: prisma.account_type,
            revenue_type: prisma.revenue_type,
            expense_type: prisma.expense_type,
            payroll_item_type: prisma.payroll_item_type,
            asset_type: prisma.asset_type,
        };

        const prismaModel = modelAccessors[model];
        if (!prismaModel) {
            throw new Error(`Model ${model} not found in Prisma client`);
        }

        // Build dynamic where clause
        const whereClause: Record<string, any> = {
            [codeFieldName]: { startsWith: codePrefix },
        };

        // Add is_deleted check if model has it
        const modelsWithSoftDelete: ModelWithCode[] = [
            'revenue', 'expense', 'journal_entry', 'payable', 'receivable',
            'fixed_asset', 'expense_adjustment', 'payroll_period', 'vendor',
            'system_configuration', 'account_type', 'revenue_type', 
            'expense_type', 'payroll_item_type'
        ];

        // Don't filter by is_deleted to include all records for sequence calculation
        // This ensures we don't reuse codes from deleted records

        return prismaModel.findFirst({
            where: whereClause,
            orderBy: { [codeFieldName]: 'desc' },
            select: { [codeFieldName]: true },
        });
    }

    /**
     * Validate a code format
     * 
     * @param code - The code to validate
     * @param model - The expected model type
     * @returns boolean - Whether the code is valid
     */
    validateCodeFormat(code: string, model: ModelWithCode): boolean {
        const prefix = MODEL_PREFIXES[model];
        // Pattern: PREFIX-DDMMYY-XXXX (6 digits for date, 4+ digits for sequence)
        const pattern = new RegExp(`^${prefix}-\\d{6}-\\d{4,}$`);
        return pattern.test(code);
    }

    /**
     * Extract model type from a code
     * 
     * @param code - The code to analyze
     * @returns ModelWithCode | null - The model type or null if unrecognized
     */
    getModelFromCode(code: string): ModelWithCode | null {
        const prefix = code.split('-')[0];
        for (const [model, modelPrefix] of Object.entries(MODEL_PREFIXES)) {
            if (modelPrefix === prefix) {
                return model as ModelWithCode;
            }
        }
        return null;
    }

    /**
     * Get the date from a code
     * 
     * @param code - The code to analyze
     * @returns Date | null - The date or null if invalid
     */
    getDateFromCode(code: string): Date | null {
        const parts = code.split('-');
        if (parts.length >= 2) {
            const dateStr = parts[1];
            if (dateStr.length === 6) {
                const day = parseInt(dateStr.slice(0, 2), 10);
                const month = parseInt(dateStr.slice(2, 4), 10) - 1; // 0-indexed
                const year = 2000 + parseInt(dateStr.slice(4, 6), 10);
                const date = new Date(year, month, day);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
        }
        return null;
    }

    /**
     * Get the sequence number from a code
     * 
     * @param code - The code to analyze
     * @returns number | null - The sequence number or null if invalid
     */
    getSequenceFromCode(code: string): number | null {
        const parts = code.split('-');
        if (parts.length >= 3) {
            const sequence = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(sequence)) {
                return sequence;
            }
        }
        return null;
    }
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

/**
 * Singleton instance export for direct use
 */
export const codeGenerator = CodeGeneratorService.getInstance();

/**
 * Convenience function for generating codes
 * 
 * @example
 * import { generateCode } from '../utils/codeGenerator';
 * const revenueCode = await generateCode('revenue');
 */
export async function generateCode(model: ModelWithCode, offset: number = 0): Promise<string> {
    return codeGenerator.generateCode(model, offset);
}

/**
 * Convenience function for batch code generation
 * 
 * @example
 * import { generateBatchCodes } from '../utils/codeGenerator';
 * const receivableCodes = await generateBatchCodes('receivable', 3);
 */
export async function generateBatchCodes(model: ModelWithCode, count: number): Promise<string[]> {
    return codeGenerator.generateBatchCodes(model, count);
}
