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
    const { context = 'timeline_gaps', topic, count = 3 } = body

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Gather user context
    const { data: userData } = await supabase
      .from('users')
      .select('email, birth_year')
      .eq('id', user.userId)
      .single()

    const { data: chapters } = await supabase
      .from('chapters')
      .select('title, start_year, end_year')
      .eq('user_id', user.userId)
      .order('start_year', { ascending: true })

    const { data: memories } = await supabase
      .from('memories')
      .select('title, description, approximate_date')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false })
      .limit(20)

    const { data: people } = await supabase
      .from('people')
      .select('name, relationship')
      .eq('user_id', user.userId)
      .limit(10)

    // Analyze timeline for gaps
    let timelineAnalysis = ''
    if (context === 'timeline_gaps' && userData?.birth_year) {
      const currentYear = new Date().getFullYear()
      const userAge = currentYear - userData.birth_year
      
      // Find year coverage
      const memoriesWithDates = memories?.filter(m => m.approximate_date) || []
      const coveredYears = new Set(
        memoriesWithDates.map(m => {
          const date = new Date(m.approximate_date)
          return date.getFullYear()
        })
      )

      const gaps = []
      for (let year = userData.birth_year; year <= currentYear; year++) {
        if (!coveredYears.has(year)) {
          gaps.push(year)
        }
      }

      timelineAnalysis = `User is ${userAge} years old. Coverage gaps: ${gaps.length} years without memories. Major gaps: ${findMajorGaps(gaps)}`
    }

    // Use GPT to generate personalized prompts
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are Maya, a warm and curious memory assistant. Generate ${count} thoughtful conversation prompts to help users remember and share their life memories.

Be:
- Personal and specific (reference their actual life details)
- Warm and encouraging
- Curious but not pushy
- Focused on meaningful moments, not just facts

Context types:
- timeline_gaps: Focus on unexplored periods in their life
- current_conversation: Build on what they just shared
- specific_topic: Explore a particular theme deeply
- random_exploration: Spark memories from different life areas`
        },
        {
          role: 'user',
          content: `Generate ${count} memory prompts for this user.

Context: ${context}
${topic ? `Topic: ${topic}` : ''}

User Info:
- Birth year: ${userData?.birth_year || 'Unknown'}
- Age: ${userData?.birth_year ? new Date().getFullYear() - userData.birth_year : 'Unknown'}
- Chapters: ${chapters?.map(c => `${c.title} (${c.start_year}-${c.end_year})`).join(', ') || 'None yet'}
- Recent memories: ${memories?.slice(0, 5).map(m => m.title).join(', ') || 'None yet'}
- People in network: ${people?.map(p => `${p.name} (${p.relationship})`).join(', ') || 'None yet'}
${timelineAnalysis}

Return JSON with array of prompts. Each prompt should have:
- type: 'specific' | 'exploratory' | 'reflective'
- question: The actual prompt/question
- reason: Why you're asking this (one sentence)
- suggested_era: If applicable, which life period this explores`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8
    })

    const response = JSON.parse(completion.choices[0]?.message?.content || '{"prompts":[]}')

    return NextResponse.json({
      success: true,
      data: {
        prompts: response.prompts || [],
        context_used: context,
        user_summary: {
          birth_year: userData?.birth_year,
          chapters_count: chapters?.length || 0,
          memories_count: memories?.length || 0,
          people_count: people?.length || 0
        }
      }
    })

  } catch (error: any) {
    console.error('Suggest memory prompts error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to suggest prompts' },
      { status: 500 }
    )
  }
}

// Helper to find major gaps (3+ consecutive years)
function findMajorGaps(years: number[]): string {
  if (years.length === 0) return 'None'
  
  years.sort((a, b) => a - b)
  const gaps: string[] = []
  let start = years[0]
  let prev = years[0]

  for (let i = 1; i < years.length; i++) {
    if (years[i] - prev > 1) {
      if (prev - start >= 2) {
        gaps.push(`${start}-${prev}`)
      }
      start = years[i]
    }
    prev = years[i]
  }

  if (prev - start >= 2) {
    gaps.push(`${start}-${prev}`)
  }

  return gaps.length > 0 ? gaps.join(', ') : 'None'
}
