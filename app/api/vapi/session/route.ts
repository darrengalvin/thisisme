import { NextRequest, NextResponse } from 'next/server';
import { VapiSessionStore } from '@/lib/vapi-session-store';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    console.log('📝 Session creation started');
    
    // Try to get the auth token from the Authorization header
    const authHeader = request.headers.get('Authorization');
    console.log('🔑 Auth header present:', !!authHeader);
    
    const supabase = createServerSupabaseClient();
    
    // If we have an auth header, try to use it to get the user
    let user = null;
    let authError = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      console.log('🔑 Using bearer token for auth');
      
      // Get user using the token
      const { data, error } = await supabase.auth.getUser(token);
      user = data?.user;
      authError = error;
    } else {
      // Fall back to cookie-based auth
      console.log('🍪 Using cookie-based auth');
      const { data, error } = await supabase.auth.getUser();
      user = data?.user;
      authError = error;
    }
    
    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Authentication failed', details: authError.message }, { status: 401 });
    }
    
    if (!user) {
      console.error('No user found');
      return NextResponse.json({ error: 'Unauthorized - no user found' }, { status: 401 });
    }

    console.log('👤 User authenticated:', user.id);

    // Get user profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
    }

    const userData = {
      email: user.email || '',
      name: profile?.full_name || profile?.username || '',
      birthYear: profile?.birth_year || 1980,
      currentAge: new Date().getFullYear() - (profile?.birth_year || 1980)
    };

    console.log('📋 User data prepared:', userData);

    const sessionId = await VapiSessionStore.createSession(user.id, userData);
    
    console.log('✅ Session created successfully:', sessionId);
    return NextResponse.json({ sessionId });
  } catch (error) {
    console.error('❌ Error creating VAPI session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create session', details: errorMessage },
      { status: 500 }
    );
  }
}