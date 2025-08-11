import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('ticket_notifications')
      .update({ read: true })
      .eq('user_id', token)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
    }

    return NextResponse.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error in PUT /api/support/notifications/mark-all-read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}