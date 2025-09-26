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

  // Direct upstream PATCH disabled by design; rely on webhooks/refresh to sync state
  return NextResponse.json({ success: true, message: 'Upstream update deferred to scheduler/webhooks' })
}