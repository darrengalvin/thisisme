import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Get conversation history for authenticated user
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    
    // Get conversations for this user
    const { data: conversations, error: conversationsError } = await supabaseAdmin
      .from('conversations')
      .select(`
        id,
        call_id,
        started_at,
        ended_at,
        duration_seconds,
        summary,
        conversation_messages (
          id,
          role,
          content,
          timestamp,
          tool_calls
        )
      `)
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError)
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }
    
    // Format conversations for UI
    const formattedConversations = conversations?.map(conv => ({
      id: conv.id,
      callId: conv.call_id,
      startedAt: conv.started_at,
      endedAt: conv.ended_at,
      duration: conv.duration_seconds,
      summary: conv.summary,
      messages: conv.conversation_messages
        .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          toolCalls: msg.tool_calls
        }))
    })) || []
    
    return NextResponse.json({
      conversations: formattedConversations,
      total: conversations?.length || 0
    })
    
  } catch (error) {
    console.error('Error in conversations API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}