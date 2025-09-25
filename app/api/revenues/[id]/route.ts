// api\revenues\[id]\route.ts

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAssignmentById } from '@/lib/operations/assignments'
import type { NextRequest } from 'next/server'
import { logAudit } from '@/lib/auditLogger'


export async function GET() {
  const revenues = await prisma.revenueRecord.findMany({ 
    where: { is_deleted: false },
    include: {
      category: true,
      source: true,
    },
    orderBy: { created_at: 'desc' }
  })
  return NextResponse.json(revenues)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();
    const { total_amount, collection_date } = data;
    const revenue_id = id;

    // Convert collection_date string to Date object
    const collectionDateTime = new Date(collection_date);
    
    // Validate that the collection_date is not in the future
    const now = new Date();
    if (collectionDateTime > now) {
      return NextResponse.json(
        { error: 'Collection date cannot be in the future' },
        { status: 400 }
      );
    }

    // Get the original record for comparison and validation
    const originalRecord = await prisma.revenueRecord.findUnique({
      where: { revenue_id }
    });

    if (!originalRecord || originalRecord.is_deleted) {
      return NextResponse.json(
        { error: 'Revenue record not found' },
        { status: 404 }
      );
    }

    // If linked to an assignment, get the original trip_revenue for comparison
    let originalTripRevenue = null;
    if (originalRecord.assignment_id) {
      const assignmentData = await getAssignmentById(originalRecord.assignment_id);
      originalTripRevenue = assignmentData?.trip_revenue;
    }

    // Calculate deviation percentage if there's an original trip revenue
    let deviationPercentage = null;
    if (originalTripRevenue !== null && originalTripRevenue !== undefined) {
      deviationPercentage = Math.abs((total_amount - originalTripRevenue) / originalTripRevenue * 100);
    }

    // Update the record with DateTime
    const updatedRevenue = await prisma.revenueRecord.update({
      where: { revenue_id },
      data: {
        total_amount,
        collection_date: collectionDateTime, // Store as DateTime
        source_id: null,
      },
      include: {
        category: true,
        source: true,
      }
    });

    // Log the audit trail, including deviation information if applicable
    let auditDetails = `Updated revenue record. Amount changed from ₱${originalRecord.total_amount} to ₱${total_amount}. Collection date changed to ${collectionDateTime.toISOString()}.`;
    if (deviationPercentage !== null) {
      auditDetails += ` Deviation from original trip revenue: ${deviationPercentage.toFixed(2)}%`;
    }

    await logAudit({
      action: 'UPDATE',
      table_affected: 'RevenueRecord',
      record_id: revenue_id,
      performed_by: 'ftms_user',
      details: auditDetails,
    });

    return NextResponse.json(updatedRevenue);
  } catch (error) {
    console.error('Failed to update revenue:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Internal Server Error', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Changed to use Promise
) {
  try {
    const { id } = await params; // Await the params promise
    const revenue_id = id; // Use the awaited id

    // Get the record before deletion for audit purposes
    const record = await prisma.revenueRecord.findUnique({
      where: { revenue_id }
    });

    if (!record) {
      return NextResponse.json(
        { error: 'Revenue record not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting is_deleted flag
    const deletedRevenue = await prisma.revenueRecord.update({
      where: { revenue_id },
      data: { 
        is_deleted: true,
      }
    });

    // Log the deletion in audit trail
    await logAudit({
      action: 'DELETE',
      table_affected: 'RevenueRecord',
      record_id: revenue_id,
      performed_by: 'ftms_user',
      details: `Soft deleted revenue record with amount ₱${record.total_amount}`,
    });

    return NextResponse.json(deletedRevenue);
  } catch (error) {
    console.error('Failed to delete revenue:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Internal Server Error', details: errorMessage },
      { status: 500 }
    );
  }
}