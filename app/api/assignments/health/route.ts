import { NextResponse } from 'next/server'

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Test the Operations API connectivity
    const opApiUrl = process.env.OP_API_BUSTRIP_URL || process.env.NEXT_PUBLIC_OP_API_BUSTRIP_URL;
    
    if (!opApiUrl) {
      return NextResponse.json({
        status: 'error',
        message: 'Operations API URL not configured',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      }, { status: 500 });
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${opApiUrl}?RequestType=revenue`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FTMS-Health-Check/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      return NextResponse.json({
        status: 'error',
        message: `Operations API returned HTTP ${response.status}`,
        url: opApiUrl,
        responseTime,
        timestamp: new Date().toISOString()
      }, { status: 200 });
    }

    const data = await response.json();
    
    return NextResponse.json({
      status: 'healthy',
      message: 'Operations API is accessible',
      url: opApiUrl,
      responseTime,
      dataType: Array.isArray(data) ? 'array' : typeof data,
      dataLength: Array.isArray(data) ? data.length : 'N/A',
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      status: 'error',
      message: `Operations API connectivity failed: ${errorMessage}`,
      url: process.env.OP_API_BUSTRIP_URL || process.env.NEXT_PUBLIC_OP_API_BUSTRIP_URL,
      responseTime,
      timestamp: new Date().toISOString(),
      error: errorMessage
    }, { status: 200 });
  }
} 