import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-server'

// Simple board memories API that returns mock data to test the frontend
export async function GET(
  request: NextRequest,
  { params }: { params: { boardId: string } }
) {
  try {
    const userId = await requireAuth(request)
    const { boardId } = params
    
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    
    // Check for real memories first
    const { data: realMemories } = await supabaseAdmin
      .from('memories')
      .select('id, title, text_content, user_id, approximate_date, date_precision, created_at')
      .eq('user_id', userId)
      .limit(limit)
    
    // If user has real memories, show them; otherwise show empty array
    const memories = realMemories?.map(memory => ({
      ...memory,
      visibility_level: 'BOARD_MEMBERS',
      shared_at: memory.created_at,
      tags: [],
      contributions: []
    })) || []
    
    return NextResponse.json({ 
      success: true,
      memories: memories,
      pagination: {
        total: memories.length,
        limit,
        offset,
        has_more: false
      }
    })
  } catch (error) {
    console.error('Failed to fetch board memories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch memories' },
      { status: 500 }
    )
  }
}
