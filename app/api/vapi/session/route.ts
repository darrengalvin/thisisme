import { NextRequest, NextResponse } from 'next/server';
import { VapiSessionStore } from '@/lib/vapi-session-store';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile data
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const userData = {
      email: user.email || '',
      name: profile?.full_name || profile?.username || '',
      birthYear: profile?.birth_year || 1980,
      currentAge: new Date().getFullYear() - (profile?.birth_year || 1980)
    };

    const sessionId = await VapiSessionStore.createSession(user.id, userData);
    
    return NextResponse.json({ sessionId });
  } catch (error) {
    console.error('Error creating VAPI session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}