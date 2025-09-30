// lib/operations/assignments.ts
// New assignments service that uses Operations API instead of Supabase

export type Assignment = {
  assignment_id: string;
  bus_trip_id: string;
  bus_route: string;
  is_revenue_recorded: boolean;
  is_expense_recorded: boolean;
  date_assigned: string;
  trip_fuel_expense: number;
  trip_revenue: number;
  assignment_type: string;
  assignment_value: number;
  payment_method: string;
  driver_name: string | null;
  conductor_name: string | null;
  bus_plate_number: string | null;
  bus_type: string | null;
  body_number: string | null;
  // Legacy fields for backward compatibility
  driver_id?: string | undefined;
  conductor_id?: string | undefined;
};

// Raw assignment type from Operations API - matches exact API response
type RawAssignment = {
  assignment_id: string;
  bus_trip_id: string;
  bus_route: string;
  is_revenue_recorded: boolean;
  is_expense_recorded: boolean;
  date_assigned: string;
  trip_fuel_expense: number;
  trip_revenue: number;
  assignment_type: string;
  assignment_value: number;
  payment_method: string | null;
  driver_name: string | null;
  conductor_name: string | null;
  bus_plate_number: string | null;
  bus_type: string | null;
  body_number: string | null;
};

// Operations API base URL - must be set in environment variables
// Use NEXT_PUBLIC_ prefix for client-side access, fallback to server-side variable
const OP_API_BUSTRIP_URL = process.env.NEXT_PUBLIC_OP_API_BUSTRIP_URL || process.env.OP_API_BUSTRIP_URL;

// Fetch all assignments from Operations API (client-side uses API route)
export async function getAllAssignments(): Promise<Assignment[]> {
  try {
    // Client-side: use local API route to avoid CORS
    const response = await fetch('/api/assignments?RequestType=revenue');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    // Check if the response indicates an API issue
    const apiStatus = response.headers.get('X-API-Status');
    if (apiStatus === 'fallback-empty' || apiStatus === 'error-fallback') {
      console.warn('Operations API is unavailable, returning empty assignments array');
      return [];
    }
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching assignments from Operations API:', error);
    // Return empty array as fallback instead of throwing
    console.warn('Returning empty assignments array as fallback due to API connectivity issues');
    return [];
  }
}

// Server-side only function for direct API calls with retry logic
export async function fetchAssignmentsFromOperationsAPI(): Promise<Assignment[]> {
  if (!process.env.OP_API_BUSTRIP_URL) {
    throw new Error('OP_API_BUSTRIP_URL environment variable is required for server-side fetching');
  }

  const maxRetries = 3;
  const timeout = 15000; // 15 seconds timeout
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempting to fetch assignments from Operations API (attempt ${attempt}/${maxRetries})`);
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${process.env.OP_API_BUSTRIP_URL}?RequestType=revenue`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FTMS-System/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format: expected array');
      }
      
      // Transform the data to match our Assignment type and deduplicate
      const transformedData = data.map((assignment: RawAssignment) => {
        let normalizedBusType = assignment.bus_type;
        if (normalizedBusType === 'Non-Aircon') normalizedBusType = 'Ordinary';
        return {
          assignment_id: assignment.assignment_id,
          bus_trip_id: assignment.bus_trip_id,
          bus_route: assignment.bus_route,
          is_revenue_recorded: assignment.is_revenue_recorded ?? false,
          is_expense_recorded: assignment.is_expense_recorded ?? false,
          date_assigned: assignment.date_assigned,
          trip_fuel_expense: Number(assignment.trip_fuel_expense) || 0,
          trip_revenue: Number(assignment.trip_revenue) || 0,
          assignment_type: assignment.assignment_type,
          assignment_value: Number(assignment.assignment_value) || 0,
          payment_method: assignment.payment_method ?? '',
          driver_name: assignment.driver_name,
          conductor_name: assignment.conductor_name,
          bus_plate_number: assignment.bus_plate_number,
          bus_type: normalizedBusType,
          body_number: assignment.body_number,
          driver_id: assignment.driver_name || undefined,
          conductor_id: assignment.conductor_name || undefined,
        };
      });

      // Deduplicate based on assignment_id and date_assigned combination
      const uniqueAssignments = transformedData.filter((assignment, index, self) => {
        const key = `${assignment.assignment_id}-${assignment.date_assigned}`;
        return index === self.findIndex(a => `${a.assignment_id}-${a.date_assigned}` === key);
      });

      console.log(`Successfully fetched ${data.length} assignments from Operations API, deduplicated to ${uniqueAssignments.length}`);
      return uniqueAssignments;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Log detailed error information
      console.error(`Attempt ${attempt}/${maxRetries} failed:`, {
        error: lastError.message,
        stack: lastError.stack,
        url: process.env.OP_API_BUSTRIP_URL,
        attempt,
        maxRetries
      });

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5 seconds
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // If we get here, all retries failed
  const errorMessage = lastError ? lastError.message : 'Unknown error';
  console.error(`All ${maxRetries} attempts to fetch assignments failed. Last error: ${errorMessage}`);
  
  // Return empty array as fallback instead of throwing
  console.warn('Returning empty assignments array as fallback due to API connectivity issues');
  return [];
}

// Get assignment by ID
export async function getAssignmentById(id: string): Promise<Assignment | null> {
  try {
    const isServerSide = typeof window === 'undefined';
    if (isServerSide) {
      // Prefer cache on server
      const prismaAny = (await import('@/lib/prisma')).prisma as any;
      const row = await prismaAny.busTripCache.findUnique({ where: { assignment_id: id } });
      if (row) {
        return {
          assignment_id: row.assignment_id,
          bus_trip_id: row.bus_trip_id,
          bus_route: row.bus_route,
          is_revenue_recorded: Boolean((row as any).is_revenue_recorded),
          is_expense_recorded: Boolean((row as any).is_expense_recorded),
          date_assigned: (row as any).date_assigned?.toISOString?.() ?? (row as any).date_assigned,
          trip_fuel_expense: Number((row as any).trip_fuel_expense) || 0,
          trip_revenue: Number((row as any).trip_revenue) || 0,
          assignment_type: (row as any).assignment_type,
          assignment_value: Number((row as any).assignment_value) || 0,
          payment_method: (row as any).payment_method || '',
          driver_name: (row as any).driver_name || null,
          conductor_name: (row as any).conductor_name || null,
          bus_plate_number: (row as any).bus_plate_number || null,
          bus_type: (row as any).bus_type || null,
          body_number: (row as any).body_number || null,
        };
      }
      // Do not call external Operations API here; enforce cache-only on server
      return null;
    }
    // Client-side: use local API route (served from cache)
    const assignments = await getAllAssignments();
    const assignment = assignments.find(assignment => assignment.assignment_id === id);
    return assignment || null;
  } catch (error) {
    console.error('Error fetching assignment by ID:', error);
    return null;
  }
}

// Get unrecorded revenue assignments (for revenue module)
export async function getUnrecordedRevenueAssignments(): Promise<Assignment[]> {
  try {
    const assignments = await getAllAssignments();
    // Since we don't have is_revenue_recorded from Operations API,
    // we'll return all assignments and let the frontend handle filtering
    return assignments;
  } catch (error) {
    console.error('Error fetching unrecorded revenue assignments:', error);
    // Return empty array as fallback
    return [];
  }
}

// Get unrecorded expense assignments (for expense module)
export async function getUnrecordedExpenseAssignments(): Promise<Assignment[]> {
  try {
    const assignments = await getAllAssignments();
    // Since we don't have is_expense_recorded from Operations API,
    // we'll return all assignments and let the frontend handle filtering
    return assignments;
  } catch (error) {
    console.error('Error fetching unrecorded expense assignments:', error);
    // Return empty array as fallback
    return [];
  }
}

// Get all assignments with recorded status (for backward compatibility)
export async function getAllAssignmentsWithRecorded(): Promise<Assignment[]> {
  try {
    const assignments = await getAllAssignments();
    // Since we don't have recorded status from Operations API,
    // we'll return all assignments with default values
    return assignments.map(assignment => ({
      ...assignment,
      is_expense_recorded: false,
      is_revenue_recorded: false,
    }));
  } catch (error) {
    console.error('Error fetching assignments with recorded status:', error);
    // Return empty array as fallback
    return [];
  }
}

// Update assignment recorded status (placeholder - Operations API doesn't support this)
export async function updateAssignmentIsRecorded(): Promise<{ success: boolean; message: string }> {
  console.warn('updateAssignmentIsRecorded called but Operations API does not support updating recorded status');
  // This is a placeholder since Operations API doesn't support updating recorded status
  // In a real implementation, you might want to store this in your local database
  return { success: true, message: 'Recorded status would be updated in local database' };
}

// Refresh assignments cache (placeholder - no cache with Operations API)
export async function refreshAssignmentsCache(): Promise<Assignment[]> {
  //console.log('Refreshing assignments from Operations API');
  return await getAllAssignments();
} 