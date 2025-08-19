import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing session creation...');
    
    // Test 1: Check environment variables
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    };
    
    console.log('📋 Environment check:', envCheck);
    
    // Test 2: Check auth
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      return NextResponse.json({
        error: 'Auth check failed',
        details: authError.message,
        envCheck
      }, { status: 401 });
    }
    
    if (!user) {
      return NextResponse.json({
        error: 'No user session',
        envCheck
      }, { status: 401 });
    }
    
    // Test 3: Check profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    // Test 4: Try to create a test session
    const sessionId = crypto.randomUUID();
    const testSessionData = {
      session_id: sessionId,
      user_id: user.id,
      user_data: {
        email: user.email,
        name: profile?.full_name || profile?.username || 'Unknown',
        birthYear: profile?.birth_year || 1980,
        currentAge: new Date().getFullYear() - (profile?.birth_year || 1980)
      },
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };
    
    // First, let's test if we can query the vapi_sessions table
    const { data: existingSessions, error: queryError } = await supabase
      .from('vapi_sessions')
      .select('*')
      .limit(1);
    
    if (queryError) {
      return NextResponse.json({
        error: 'Cannot query vapi_sessions table',
        details: queryError.message,
        hint: 'Table might not exist or permissions issue',
        envCheck,
        user: { id: user.id, email: user.email }
      }, { status: 500 });
    }
    
    // Now try to insert
    const { data: insertedSession, error: insertError } = await supabase
      .from('vapi_sessions')
      .insert(testSessionData)
      .select()
      .single();
    
    if (insertError) {
      return NextResponse.json({
        error: 'Cannot insert into vapi_sessions',
        details: insertError.message,
        envCheck,
        user: { id: user.id, email: user.email },
        attemptedData: testSessionData
      }, { status: 500 });
    }
    
    // Clean up test session
    await supabase
      .from('vapi_sessions')
      .delete()
      .eq('session_id', sessionId);
    
    return NextResponse.json({
      success: true,
      message: 'All tests passed!',
      envCheck,
      user: {
        id: user.id,
        email: user.email,
        hasProfile: !!profile
      },
      testSession: {
        created: !!insertedSession,
        sessionId
      }
    });
    
  } catch (error) {
    console.error('❌ Test session error:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}