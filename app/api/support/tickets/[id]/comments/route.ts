import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import sgMail from '@sendgrid/mail';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

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

    const { data: comments, error } = await supabase
      .from('ticket_comments')
      .select(`
        *,
        user:users!ticket_comments_user_id_fkey(id, email),
        attachments:ticket_attachments(*)
      `)
      .eq('ticket_id', params.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', userInfo.userId)
      .single();

    const filteredComments = comments?.filter(comment => 
      !comment.is_internal || userData?.is_admin
    );

    return NextResponse.json({ comments: filteredComments });
  } catch (error) {
    console.error('Error in GET /api/support/tickets/[id]/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
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
    const { comment, is_internal = false } = body;

    if (!comment) {
      return NextResponse.json({ error: 'Comment is required' }, { status: 400 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, email, is_admin')
      .eq('id', userInfo.userId)
      .single();

    if (is_internal && !userData?.is_admin) {
      return NextResponse.json({ error: 'Only admins can post internal comments' }, { status: 403 });
    }

    const { data: ticketData } = await supabase
      .from('tickets')
      .select(`
        *,
        creator:users!tickets_creator_id_fkey(id, email),
        assignee:users!tickets_assignee_id_fkey(id, email)
      `)
      .eq('id', params.id)
      .single();

    if (!ticketData) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const { data: newComment, error } = await supabase
      .from('ticket_comments')
      .insert({
        ticket_id: params.id,
        user_id: userInfo.userId,
        comment,
        is_internal
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }

    if (process.env.SENDGRID_API_KEY && !is_internal) {
      const recipientEmails: string[] = [];
      
      if (ticketData.creator_id !== token && ticketData.creator?.email) {
        recipientEmails.push(ticketData.creator.email);
      }
      
      if (ticketData.assignee_id && 
          ticketData.assignee_id !== token && 
          ticketData.assignee?.email) {
        recipientEmails.push(ticketData.assignee.email);
      }

      if (recipientEmails.length > 0) {
        try {
          await sgMail.send({
            to: recipientEmails,
            from: process.env.SENDGRID_FROM_EMAIL || 'support@yourapp.com',
            subject: `New comment on ticket: ${ticketData.title}`,
            text: `${userData?.email} commented on ticket #${params.id}:\n\n${comment}\n\nView ticket: ${process.env.NEXT_PUBLIC_URL}/support/tickets/${params.id}`,
            html: `
              <p><strong>${userData?.email}</strong> commented on ticket #${params.id}:</p>
              <blockquote>${comment}</blockquote>
              <p><a href="${process.env.NEXT_PUBLIC_URL}/support/tickets/${params.id}">View ticket</a></p>
            `
          });

          await supabase
            .from('ticket_notifications')
            .insert(recipientEmails.map(email => ({
              ticket_id: params.id,
              user_id: email === ticketData.creator?.email ? ticketData.creator_id : ticketData.assignee_id,
              type: 'commented',
              email_sent: true
            })));
        } catch (emailError) {
          console.error('Error sending email:', emailError);
        }
      }
    }

    return NextResponse.json({ comment: newComment }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/support/tickets/[id]/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}