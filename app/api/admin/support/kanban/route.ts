import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

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

    // Verify JWT token and extract user ID
    const { verifyToken } = await import('@/lib/auth');
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

    const { data: tickets, error } = await supabase
      .from('tickets')
      .select(`
        *,
        creator:users!tickets_creator_id_fkey(id, email),
        assignee:users!tickets_assignee_id_fkey(id, email),
        _count:ticket_comments(count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching kanban data:', error);
      return NextResponse.json({ error: 'Failed to fetch kanban data' }, { status: 500 });
    }

    const stages = ['backlog', 'todo', 'doing', 'testing', 'done'];
    const kanbanData = stages.reduce((acc, stage) => {
      acc[stage] = tickets?.filter(ticket => ticket.stage === stage) || [];
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({ kanban: kanbanData, stages });
  } catch (error) {
    console.error('Error in GET /api/admin/support/kanban:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify JWT token and extract user ID
    const { verifyToken } = await import('@/lib/auth');
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

    const body = await request.json();
    const { ticketId, newStage, position } = body;

    if (!ticketId || !newStage) {
      return NextResponse.json(
        { error: 'Ticket ID and new stage are required' },
        { status: 400 }
      );
    }

    // Get the current ticket to record old stage
    const { data: currentTicket } = await supabase
      .from('tickets')
      .select('stage')
      .eq('id', ticketId)
      .single();

    // Update ticket stage
    const { data: ticket, error } = await supabase
      .from('tickets')
      .update({ 
        stage: newStage,
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      console.error('Error updating ticket stage:', error);
      return NextResponse.json({ error: 'Failed to update ticket stage' }, { status: 500 });
    }

    // Log history entry with user_id
    try {
      await supabase
        .from('ticket_history')
        .insert({
          ticket_id: ticketId,
          user_id: userInfo.userId,
          action: 'stage_move',
          old_value: currentTicket?.stage || null,
          new_value: newStage
        });
    } catch (historyError) {
      console.error('Error logging ticket history:', historyError);
      // Don't fail the request if history logging fails
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('Error in PUT /api/admin/support/kanban:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}