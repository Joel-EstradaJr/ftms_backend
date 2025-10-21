// app/api/assignments/route.ts
// Proxy route to fetch bus trip assignments from Operations API

import { NextRequest, NextResponse } from 'next/server';

const OP_API_URL = process.env.OP_API_BUSTRIP_URL || process.env.NEXT_PUBLIC_OP_API_BUSTRIP_URL;

export async function GET(request: NextRequest) {
  try {
    if (!OP_API_URL) {
      return NextResponse.json(
        { error: 'Operations API URL not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestType = searchParams.get('RequestType') || 'revenue';

    console.log('🚌 Fetching assignments from Operations API:', OP_API_URL);
    console.log('📋 Request Type:', requestType);

    const response = await fetch(`${OP_API_URL}?RequestType=${requestType}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Always fetch fresh data
    });

    if (!response.ok) {
      console.error('❌ Operations API error:', response.status, response.statusText);
      throw new Error(`Operations API returned ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Received', data?.length || 0, 'assignments from Operations API');

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ Error fetching assignments:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch assignments',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
