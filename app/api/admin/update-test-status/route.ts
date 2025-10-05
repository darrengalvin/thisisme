import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/admin/update-test-status - Update test suite status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { suite_key, passing_tests, failing_tests, percentage, status } = body;

    if (!suite_key) {
      return NextResponse.json(
        { error: 'suite_key is required' },
        { status: 400 }
      );
    }

    // Calculate values if not provided
    const total_tests = passing_tests + failing_tests;
    const computed_percentage = percentage ?? Math.round((passing_tests / total_tests) * 100);
    const computed_status = status ?? (failing_tests === 0 ? 'done' : failing_tests <= 2 ? 'almost' : 'failing');

    // Update test suite
    const { error: suiteError } = await supabase
      .from('test_suites')
      .update({
        passing_tests,
        failing_tests,
        percentage: computed_percentage,
        status: computed_status,
        updated_at: new Date().toISOString(),
      })
      .eq('suite_key', suite_key);

    if (suiteError) {
      console.error('Error updating test suite:', suiteError);
      return NextResponse.json(
        { error: 'Failed to update test suite', details: suiteError },
        { status: 500 }
      );
    }

    // Update test details if all tests are passing
    if (failing_tests === 0) {
      const { error: detailsError } = await supabase
        .from('test_details')
        .update({
          status: 'passing',
          issue: null,
        })
        .eq('suite_key', suite_key)
        .eq('status', 'failing');

      if (detailsError) {
        console.error('Error updating test details:', detailsError);
      }
    }

    // Fetch updated data
    const { data: updated } = await supabase
      .from('test_suites')
      .select('*')
      .eq('suite_key', suite_key)
      .single();

    return NextResponse.json({
      success: true,
      message: `Updated ${suite_key} test suite`,
      data: updated,
    });
  } catch (error) {
    console.error('Error in update-test-status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
