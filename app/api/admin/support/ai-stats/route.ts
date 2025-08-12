import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userInfo = await verifyToken(token);
    if (!userInfo) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', userInfo.userId)
      .single();

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Try to get AI stats from the view (if tables exist)
    const { data: stats, error: statsError } = await supabase
      .from('ai_system_stats')
      .select('*')
      .single();

    if (statsError) {
      // If AI tables don't exist yet, return default stats
      console.log('AI tables not yet created, returning default stats');
      return NextResponse.json({
        stats: {
          total_analyses: 0,
          total_fixes_generated: 0,
          fixes_applied: 0,
          fixes_failed: 0,
          avg_confidence: 0,
          auto_applicable_fixes: 0,
          successful_applications: 0,
          rollbacks_performed: 0
        },
        setup_required: true,
        message: 'AI system database tables need to be created. Run the 004_ai_support_system.sql migration.'
      });
    }

    return NextResponse.json({ 
      stats,
      setup_required: false 
    });

  } catch (error) {
    console.error('Error fetching AI stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
