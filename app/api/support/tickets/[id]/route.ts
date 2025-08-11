import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { data: ticket, error } = await supabase
      .from('tickets')
      .select(`
        *,
        creator:users!tickets_creator_id_fkey(id, email),
        assignee:users!tickets_assignee_id_fkey(id, email),
        comments:ticket_comments(
          id,
          comment,
          is_internal,
          created_at,
          user:users!ticket_comments_user_id_fkey(id, email)
        ),
        attachments:ticket_attachments(*),
        history:ticket_history(
          id,
          action,
          old_value,
          new_value,
          created_at,
          user:users!ticket_history_user_id_fkey(id, email)
        )
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching ticket:', error);
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, is_admin')
      .eq('id', userInfo.userId)
      .single();

    if (!userData?.is_admin && 
        ticket.creator_id !== userInfo.userId && 
        ticket.assignee_id !== userInfo.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('Error in GET /api/support/tickets/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const body = await request.json();
    const { status, priority, stage, assignee_id, title, description } = body;

    const { data: userData } = await supabase
      .from('users')
      .select('id, is_admin')
      .eq('id', userInfo.userId)
      .single();

    const { data: existingTicket } = await supabase
      .from('tickets')
      .select('creator_id, assignee_id')
      .eq('id', params.id)
      .single();

    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const canEdit = userData?.is_admin || 
                   existingTicket.creator_id === userInfo.userId || 
                   existingTicket.assignee_id === userInfo.userId;

    if (!canEdit) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (stage !== undefined) updateData.stage = stage;
    if (assignee_id !== undefined) updateData.assignee_id = assignee_id;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;

    const { data: ticket, error } = await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating ticket:', error);
      return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('Error in PUT /api/support/tickets/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', token)
      .single();

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Only admins can delete tickets' }, { status: 403 });
    }

    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Error deleting ticket:', error);
      return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/support/tickets/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}