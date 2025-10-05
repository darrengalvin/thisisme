import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/test-suites - Get all test suite summaries
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('test_suites')
      .select('*')
      .order('phase', { ascending: true })
      .order('total_tests', { ascending: false });

    if (error) {
      console.error('Error fetching test suites:', error);
      return NextResponse.json(
        { error: 'Failed to fetch test suites' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in test suites GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
