import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { verifyToken } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

export async function POST(request: NextRequest) {
  try {
    // Extract and verify token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { trigger = 'explicit_request', recent_memory_id } = body

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get all user data
    const { data: userData } = await supabase
      .from('users')
      .select('email, birth_year')
      .eq('id', user.userId)
      .single()

    const { data: chapters } = await supabase
      .from('chapters')
      .select('id, title, start_year, end_year, description')
      .eq('user_id', user.userId)
      .order('start_year', { ascending: true })

    const { data: memories } = await supabase
      .from('memories')
      .select('id, title, description, approximate_date, chapter_id')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false })

    // Analyze chapter distribution
    const chapterMemoryCounts: Record<string, number> = {}
    const memoriesWithoutChapter: any[] = []
    
    memories?.forEach(memory => {
      if (memory.chapter_id) {
        chapterMemoryCounts[memory.chapter_id] = (chapterMemoryCounts[memory.chapter_id] || 0) + 1
      } else {
        memoriesWithoutChapter.push(memory)
      }
    })

    // Get recent memory context if provided
    let recentMemoryContext = ''
    if (recent_memory_id) {
      const recentMemory = memories?.find(m => m.id === recent_memory_id)
      if (recentMemory) {
        recentMemoryContext = `Recent memory: "${recentMemory.title}" - ${recentMemory.description?.substring(0, 200)}`
      }
    }

    // Use GPT to analyze and suggest
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are Maya, an intelligent timeline organizer. Analyze a user's memories and chapters to suggest smart organizational improvements.

You can suggest:
1. Creating new chapters for clustered memories
2. Merging overlapping or similar chapters
3. Splitting broad chapters into more specific ones
4. Moving memories to better-fitting chapters

Consider:
- Temporal patterns (memories from same period)
- Thematic connections (similar topics/themes)
- Natural life boundaries (moves, job changes, relationships)
- Chapter balance (avoid too many/few memories per chapter)

Be thoughtful - only suggest changes that genuinely improve organization.`
        },
        {
          role: 'user',
          content: `Analyze this timeline and suggest improvements:

User Context:
- Birth year: ${userData?.birth_year || 'Unknown'}
- Total memories: ${memories?.length || 0}
- Current chapters: ${chapters?.length || 0}
- Memories without chapters: ${memoriesWithoutChapter.length}

Existing Chapters:
${chapters?.map(c => {
  const memCount = chapterMemoryCounts[c.id] || 0
  return `- ${c.title} (${c.start_year}-${c.end_year}): ${memCount} memories`
}).join('\n') || 'None'}

Recent Memories (titles only):
${memories?.slice(0, 20).map(m => `- ${m.title} ${m.approximate_date ? `(${new Date(m.approximate_date).getFullYear()})` : ''}`).join('\n') || 'None'}

${recentMemoryContext}

Trigger: ${trigger}

Return JSON with:
{
  "suggestions": [
    {
      "action": "create" | "merge" | "split" | "move_memory",
      "confidence": "high" | "medium" | "low",
      "title": "chapter title (for create/merge)",
      "reason": "why this would help",
      "estimated_years": "year range (for create)",
      "chapters": ["id1", "id2"] (for merge),
      "into": "new title" (for merge),
      "chapter_id": "id" (for split),
      "split_into": [{title, years, reason}] (for split),
      "memory_ids": ["id1"] (for move),
      "target_chapter": "chapter name" (for move),
      "impact": "how many memories affected"
    }
  ],
  "overall_health": "good" | "needs_attention" | "disorganized",
  "summary": "overall assessment"
}

Only suggest 2-3 most impactful changes. Be selective.`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.6
    })

    const analysis = JSON.parse(completion.choices[0]?.message?.content || '{}')

    return NextResponse.json({
      success: true,
      data: {
        suggestions: analysis.suggestions || [],
        overall_health: analysis.overall_health || 'unknown',
        summary: analysis.summary || '',
        timeline_stats: {
          total_memories: memories?.length || 0,
          total_chapters: chapters?.length || 0,
          unorganized_memories: memoriesWithoutChapter.length,
          chapter_distribution: chapterMemoryCounts
        }
      }
    })

  } catch (error: any) {
    console.error('Smart chapter suggestion error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to suggest chapter improvements' },
      { status: 500 }
    )
  }
}
