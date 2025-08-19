import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    // Check if vapi_sessions table exists and is accessible
    const { data: tables, error: tablesError } = await supabase
      .from('vapi_sessions')
      .select('*')
      .limit(1);
    
    if (tablesError) {
      return NextResponse.json({
        vapi_sessions_exists: false,
        error: tablesError.message,
        hint: 'Run the migration: CREATE TABLE vapi_sessions (...)',
        code: tablesError.code
      });
    }
    
    // Check if we can insert (test permissions)
    const testId = `test-${Date.now()}`;
    const { error: insertError } = await supabase
      .from('vapi_sessions')
      .insert({
        session_id: testId,
        user_id: user.id,
        user_data: { test: true },
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 1000).toISOString()
      });
    
    if (insertError) {
      return NextResponse.json({
        vapi_sessions_exists: true,
        can_read: true,
        can_insert: false,
        insert_error: insertError.message
      });
    }
    
    // Clean up test record
    await supabase
      .from('vapi_sessions')
      .delete()
      .eq('session_id', testId);
    
    // Check profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    return NextResponse.json({
      success: true,
      tables: {
        vapi_sessions: {
          exists: true,
          can_read: true,
          can_insert: true,
          can_delete: true
        },
        profiles: {
          exists: !profileError,
          has_data: !!profile,
          user_profile: profile
        }
      },
      user: {
        id: user.id,
        email: user.email
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check tables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}