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
    const { memory_title, memory_description, user_context } = body

    if (!memory_title && !memory_description) {
      return NextResponse.json(
        { success: false, error: 'Memory title or description required' },
        { status: 400 }
      )
    }

    // Get user's timeline context from database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: userData } = await supabase
      .from('users')
      .select('email, birth_year, created_at')
      .eq('id', user.userId)
      .single()

    const { data: chapters } = await supabase
      .from('chapters')
      .select('title, start_year, end_year')
      .eq('user_id', user.userId)
      .order('start_year', { ascending: true })

    const { data: recentMemories } = await supabase
      .from('memories')
      .select('title, description, approximate_date')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Use GPT-5 (or GPT-4) for intelligent enrichment suggestions
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview', // Will upgrade to gpt-5 when available
      messages: [
        {
          role: 'system',
          content: `You are Maya, an empathetic memory assistant helping users enrich their life stories. 

Your role is to:
1. Ask thoughtful, clarifying questions about their memory
2. Suggest additional details they might want to add
3. Recommend relevant chapters or periods to place it in
4. Find connections to other memories or people
5. Suggest images or locations that could enhance the memory

Be conversational, warm, and curious. Focus on helping them remember more details and capture the emotional significance.`
        },
        {
          role: 'user',
          content: `User is creating a memory:
Title: ${memory_title || 'Untitled'}
Description: ${memory_description || 'No description yet'}

User Context:
- Birth year: ${userData?.birth_year || 'Unknown'}
- Existing chapters: ${chapters?.map(c => `${c.title} (${c.start_year}-${c.end_year})`).join(', ') || 'None'}
- Recent memories: ${recentMemories?.map(m => m.title).slice(0, 3).join(', ') || 'None'}

Analyze this memory and provide:
1. 2-3 thoughtful questions to enrich the memory
2. Suggestions for additional details to capture
3. Recommended chapter placement (or suggest creating a new chapter)
4. Potential image search queries
5. Any detected locations or people mentioned

Format as JSON with keys: questions (array), suggestions (array), chapter_recommendation (object), image_queries (array), detected_entities (object with people and locations arrays).`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    })

    const analysis = JSON.parse(completion.choices[0]?.message?.content || '{}')

    return NextResponse.json({
      success: true,
      data: {
        enrichment: analysis,
        user_timeline_context: {
          birth_year: userData?.birth_year,
          chapter_count: chapters?.length || 0,
          memory_count: recentMemories?.length || 0
        }
      }
    })

  } catch (error: any) {
    console.error('Suggest memory enrichment error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to suggest enrichment' },
      { status: 500 }
    )
  }
}
