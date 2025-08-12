import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

// Initialize OpenAI client only if API key is available
let openai: OpenAI | null = null
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    if (!openai) {
      return NextResponse.json(
        { error: 'AI analysis service not configured' },
        { status: 503 }
      )
    }

    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userInfo = await verifyToken(token)
    if (!userInfo) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', userInfo.userId)
      .single()

    if (!userData?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { ticketId } = await request.json()
    
    // Fetch ticket details
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single()

    if (error || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // AI Analysis Prompt
    const analysisPrompt = `
Analyze this support ticket and provide intelligent insights:

TICKET DETAILS:
Title: ${ticket.title}
Description: ${ticket.description}
Category: ${ticket.category}
Priority: ${ticket.priority}
Status: ${ticket.status}

ANALYSIS TASKS:
1. CODE_LOCATION: Identify likely files/components that need to be examined
2. ROOT_CAUSE: Analyze the probable root cause of this issue
3. COMPLEXITY: Rate complexity (1-10) and estimated fix time
4. SIMILAR_PATTERNS: Identify if this matches known patterns
5. AUTO_FIXABLE: Determine if this could be automatically fixed
6. SUGGESTED_APPROACH: Recommend the best approach to solve this
7. TESTING_STRATEGY: Suggest how to test the fix
8. RELATED_RISKS: Identify potential risks or side effects

Return a structured JSON response with these analysis points.
`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert software engineering AI that analyzes bug reports and feature requests for a Next.js memory-sharing application. Focus on practical, actionable insights."
        },
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    })

    const analysis = JSON.parse(completion.choices[0].message.content || '{}')

    // Store AI analysis in the database
    const { data: aiAnalysis, error: storeError } = await supabase
      .from('ai_ticket_analysis')
      .insert({
        ticket_id: ticketId,
        analysis_data: analysis,
        model_used: 'gpt-4o',
        analyzed_at: new Date().toISOString(),
        analyzed_by: userInfo.userId
      })
      .select()
      .single()

    if (storeError) {
      console.error('Error storing AI analysis:', storeError)
    }

    return NextResponse.json({
      success: true,
      ticket,
      analysis,
      recommendations: {
        autoFixable: analysis.AUTO_FIXABLE,
        complexity: analysis.COMPLEXITY,
        estimatedTime: analysis.ESTIMATED_TIME,
        suggestedApproach: analysis.SUGGESTED_APPROACH
      }
    })

  } catch (error) {
    console.error('Error analyzing ticket:', error)
    return NextResponse.json(
      { error: 'Failed to analyze ticket', details: error },
      { status: 500 }
    )
  }
}
