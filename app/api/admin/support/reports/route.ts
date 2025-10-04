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

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let ticketsQuery = supabase.from('tickets').select('*');
    
    if (startDate) {
      ticketsQuery = ticketsQuery.gte('created_at', startDate);
    }
    if (endDate) {
      ticketsQuery = ticketsQuery.lte('created_at', endDate);
    }

    const { data: tickets, error: ticketsError } = await ticketsQuery;

    if (ticketsError) {
      console.error('Error fetching tickets for reports:', ticketsError);
      return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
    }

    const { data: stats } = await supabase
      .from('ticket_stats')
      .select('*')
      .single();

    const totalTickets = tickets?.length || 0;
    const openTickets = tickets?.filter(t => t.status === 'open').length || 0;
    const inProgressTickets = tickets?.filter(t => t.status === 'in_progress').length || 0;
    const resolvedTickets = tickets?.filter(t => t.status === 'resolved').length || 0;
    const closedTickets = tickets?.filter(t => t.status === 'closed').length || 0;

    const priorityBreakdown = {
      critical: tickets?.filter(t => t.priority === 'critical').length || 0,
      high: tickets?.filter(t => t.priority === 'high').length || 0,
      medium: tickets?.filter(t => t.priority === 'medium').length || 0,
      low: tickets?.filter(t => t.priority === 'low').length || 0,
    };

    const categoryBreakdown = {
      bug: tickets?.filter(t => t.category === 'bug').length || 0,
      feature: tickets?.filter(t => t.category === 'feature').length || 0,
      question: tickets?.filter(t => t.category === 'question').length || 0,
      improvement: tickets?.filter(t => t.category === 'improvement').length || 0,
    };

    const resolvedTicketsData = tickets?.filter(t => t.resolved_at) || [];
    const resolutionTimes = resolvedTicketsData.map(t => {
      const created = new Date(t.created_at).getTime();
      const resolved = new Date(t.resolved_at).getTime();
      return (resolved - created) / (1000 * 60 * 60);
    });

    const avgResolutionTime = resolutionTimes.length > 0
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
      : 0;

    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const ticketTrend = last30Days.map(date => {
      const dayTickets = tickets?.filter(t => 
        t.created_at.startsWith(date)
      ).length || 0;
      return { date, count: dayTickets };
    });

    const report = {
      summary: {
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        avgResolutionTime: avgResolutionTime.toFixed(2),
      },
      priorityBreakdown,
      categoryBreakdown,
      ticketTrend,
      topAssignees: await getTopAssignees(tickets),
      recentActivity: await getRecentActivity(),
    };

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Error in GET /api/admin/support/reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function getTopAssignees(tickets: any[]) {
  if (!tickets) return [];
  
  const assigneeCounts: Record<string, number> = {};
  
  tickets.forEach(ticket => {
    if (ticket.assignee_id) {
      assigneeCounts[ticket.assignee_id] = (assigneeCounts[ticket.assignee_id] || 0) + 1;
    }
  });

  const assigneeIds = Object.keys(assigneeCounts);
  if (assigneeIds.length === 0) return [];

  const { data: users } = await supabase
    .from('users')
    .select('id, email')
    .in('id', assigneeIds);

  return Object.entries(assigneeCounts)
    .map(([id, count]) => ({
      id,
      email: users?.find(u => u.id === id)?.email || 'Unknown',
      count
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

async function getRecentActivity() {
  const { data: history } = await supabase
    .from('ticket_history')
    .select(`
      *,
      ticket:tickets(id, title),
      user:users!ticket_history_user_id_fkey(id, email)
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  return history || [];
}