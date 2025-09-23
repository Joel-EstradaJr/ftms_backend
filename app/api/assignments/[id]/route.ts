// api\assignments\[id]\route.ts
import { NextResponse } from 'next/server'
import { getAssignmentById } from '../../../../lib/operations/assignments'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.pathname.split('/').pop()

  if (!id) {
    return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 })
  }

  try {
    const assignment = await getAssignmentById(id)

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    return NextResponse.json(assignment)
  } catch (error: unknown) {
    console.error('Failed to fetch assignment from Operations API:', error)

    const errorMessage = error instanceof Error
      ? error.message
      : 'Internal Server Error'

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.pathname.split('/').pop()
  console.log('PATCH /api/assignments/[id] called with id:', id);

  if (!id) {
    return NextResponse.json({ error: 'Assignment ID is required' }, { status: 400 })
  }

  const assignment = await getAssignmentById(id)
  console.log('Assignment found:', assignment);

  if (!assignment || !assignment.bus_trip_id) {
    return NextResponse.json({ error: 'Assignment or bus_trip_id not found' }, { status: 404 })
  }

  try {
    const patchPayload = [
      {
        bus_trip_id: assignment.bus_trip_id,
        IsRevenueRecorded: true
      }
    ];
    const opApiUrl = process.env.OP_API_BUSTRIP_URL;
    if (!opApiUrl) {
      throw new Error('OP_API_BUSTRIP_URL environment variable is not set');
    }
    const patchResponse = await fetch(opApiUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patchPayload)
    });
    if (!patchResponse.ok) {
      const errorText = await patchResponse.text();
      return NextResponse.json({ error: `Failed to PATCH Operations API: ${patchResponse.status} - ${errorText}` }, { status: 500 });
    }
    const result = await patchResponse.json();
    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    console.error('Failed to update assignment:', error)

    const errorMessage = error instanceof Error
      ? error.message
      : 'Internal Server Error'

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}