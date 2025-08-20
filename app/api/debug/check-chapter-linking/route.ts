import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    console.log('🔍 DEBUG: Checking chapter linking for user:', userId)

    // Get all chapters for this user
    const { data: chapters, error: chaptersError } = await supabaseAdmin
      .from('chapters')
      .select('id, title, creator_id')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false })

    if (chaptersError) {
      console.error('❌ Chapters error:', chaptersError)
      return NextResponse.json({ error: 'Failed to fetch chapters', details: chaptersError }, { status: 500 })
    }

    // Get all memories for this user
    const { data: memories, error: memoriesError } = await supabaseAdmin
      .from('memories')
      .select('id, title, chapter_id, user_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (memoriesError) {
      console.error('❌ Memories error:', memoriesError)
      return NextResponse.json({ error: 'Failed to fetch memories', details: memoriesError }, { status: 500 })
    }

    // Test chapter search with "East End"
    const { data: eastEndChapters, error: searchError } = await supabaseAdmin
      .from('chapters')
      .select('id, title')
      .eq('creator_id', userId)
      .ilike('title', '%East End%')

    console.log('🔍 DEBUG Results:', {
      userId,
      totalChapters: chapters?.length || 0,
      totalMemories: memories?.length || 0,
      eastEndChapters: eastEndChapters?.length || 0
    })

    // Analyze memory-chapter relationships
    const memoriesWithChapters = memories?.filter(m => m.chapter_id) || []
    const memoriesWithoutChapters = memories?.filter(m => !m.chapter_id) || []

    return NextResponse.json({
      success: true,
      debug: {
        userId,
        chapters: chapters?.map(c => ({ id: c.id, title: c.title })) || [],
        memories: memories?.map(m => ({ 
          id: m.id, 
          title: m.title, 
          chapter_id: m.chapter_id,
          created_at: m.created_at
        })) || [],
        eastEndSearch: eastEndChapters?.map(c => ({ id: c.id, title: c.title })) || [],
        stats: {
          totalChapters: chapters?.length || 0,
          totalMemories: memories?.length || 0,
          memoriesWithChapters: memoriesWithChapters.length,
          memoriesWithoutChapters: memoriesWithoutChapters.length,
          eastEndChaptersFound: eastEndChapters?.length || 0
        }
      }
    })

  } catch (error) {
    console.error('🔍 DEBUG ERROR:', error)
    return NextResponse.json({ 
      error: 'Debug failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
