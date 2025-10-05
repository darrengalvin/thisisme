import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/test-suites/[key] - Get detailed tests for a specific suite
export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const { key } = params;

    const { data, error } = await supabase
      .from('test_details')
      .select('*')
      .eq('suite_key', key)
      .order('status', { ascending: false }) // Failing tests first
      .order('test_name', { ascending: true });

    if (error) {
      console.error(`Error fetching test details for ${key}:`, error);
      return NextResponse.json(
        { error: 'Failed to fetch test details' },
        { status: 500 }
      );
    }

    // Group by status
    const passing = data.filter(t => t.status === 'passing');
    const failing = data.filter(t => t.status === 'failing');

    return NextResponse.json({ 
      success: true, 
      data: {
        passing,
        failing
      }
    });
  } catch (error) {
    console.error('Error in test details GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
