// app\api\assignments\route.ts
import { NextResponse, NextRequest } from 'next/server'
import { fetchAssignmentsFromOperationsAPI } from '../../../lib/operations/assignments'

export async function GET(req: NextRequest) {
  try {
    const assignments = await fetchAssignmentsFromOperationsAPI();
    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10', 10));
    const total = assignments.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paged = assignments.slice(start, end);
    
    // If assignments is empty, it means the API failed but we're returning empty array as fallback
    if (assignments.length === 0) {
      console.warn('Operations API returned empty assignments array - this may indicate connectivity issues');
      const res = NextResponse.json([], { 
        status: 200,
        headers: {
          'X-API-Status': 'fallback-empty',
          'X-API-Message': 'Operations API unavailable, returning empty assignments'
        }
      });
      res.headers.set('X-Total-Count', '0');
      res.headers.set('X-Page', String(page));
      res.headers.set('X-Limit', String(limit));
      res.headers.set('X-Total-Pages', '1');
      return res;
    }
    
    const res = NextResponse.json(paged);
    res.headers.set('X-Total-Count', String(total));
    res.headers.set('X-Page', String(page));
    res.headers.set('X-Limit', String(limit));
    res.headers.set('X-Total-Pages', String(Math.max(1, Math.ceil(total / limit))));
    return res;
  } catch (error: unknown) {
    console.error('Failed to fetch assignments from Operations API:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Internal Server Error';
      
    // Return empty array with error status instead of throwing
    const res = NextResponse.json([], { 
      status: 200,
      headers: {
        'X-API-Status': 'error-fallback',
        'X-API-Error': errorMessage
      }
    });
    res.headers.set('X-Total-Count', '0');
    res.headers.set('X-Page', '1');
    res.headers.set('X-Limit', '10');
    res.headers.set('X-Total-Pages', '1');
    return res;
  }
}