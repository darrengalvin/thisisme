import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request)
    console.log('🔍 Testing real memories for user:', userId)
    
    // Get user's actual memories
    const { data: memories, error: memoriesError } = await supabaseAdmin
      .from('memories')
      .select('id, title, text_content, user_id, approximate_date, created_at')
      .eq('user_id', userId)
      .limit(5)
    
    if (memoriesError) {
      console.error('Memories error:', memoriesError)
      return NextResponse.json({ error: 'Failed to get memories', details: memoriesError.message }, { status: 500 })
    }
    
    console.log('📝 Real memories found:', memories?.length)
    
    return NextResponse.json({ 
      success: true,
      memories: memories || [],
      count: memories?.length || 0
    })
  } catch (error) {
    console.error('Failed to test real memories:', error)
    return NextResponse.json(
      { error: 'Failed to test real memories', details: error.message },
      { status: 500 }
    )
  }
}
