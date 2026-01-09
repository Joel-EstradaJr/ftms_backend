// lib/idGenerator.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TABLE_PREFIXES = {
  ASG: 'AssignmentCache',
  LOG: 'AuditLog', 
  EXP: 'ExpenseRecord',
  REV: 'RevenueRecord',
  CAT: 'GlobalCategory',
  SRC: 'GlobalSource',
  TERM: 'GlobalTerms',
  PMT: 'GlobalPaymentMethod'
} as const

type TablePrefix = keyof typeof TABLE_PREFIXES

export async function generateId(prefix: TablePrefix) {
  const tableName = TABLE_PREFIXES[prefix]
  if (!tableName) throw new Error(`Invalid table prefix: ${prefix}`)
  
  return await prisma.$transaction(async (tx) => {
    // Generate sequence for table: ${tableName}
    const sequence = await tx.sequence.upsert({
      where: { name: prefix },
      update: { value: { increment: 1 } },
      create: { name: prefix, value: 1 },
    })
    
    return `FTMS-${prefix}-${String(sequence.value).padStart(8, '0')}`
  })
}

export async function generateRevenueCode(date?: Date) {
  const targetDate = date || new Date()
  const dateStr = targetDate.toISOString().slice(0, 10).replace(/-/g, '')
  
  return await prisma.$transaction(async (tx) => {
    const dailyKey = `REV-${dateStr}`
    const sequence = await tx.sequence.upsert({
      where: { name: dailyKey },
      update: { value: { increment: 1 } },
      create: { name: dailyKey, value: 1 },
    })
    
    return `REV-${dateStr}-${String(sequence.value).padStart(4, '0')}`
  })
}

export async function generateExportId() {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  
  return await prisma.$transaction(async (tx) => {
    const dailyKey = `XPT-${dateStr}`
    const sequence = await tx.sequence.upsert({
      where: { name: dailyKey },
      update: { value: { increment: 1 } },
      create: { name: dailyKey, value: 1 },
    })
    
    return `FTMS-XPT-${dateStr}-${String(sequence.value).padStart(4, '0')}`
  })
}