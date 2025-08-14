import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { ClaudeClient } from '@/lib/ai/claude-client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Initialize Claude client
    const claude = new ClaudeClient()

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
CRITICAL: This is a Next.js memory-sharing application with specific architectural patterns.

BEFORE suggesting new features, check if they already exist:
- EditChapterModal.tsx has: hasUnsavedChanges, handleClose(), showUnsavedWarning, autosave
- EditMemoryModal.tsx has: handleClose() with loading state checks
- Parent components often bypass validation with: onClose={() => { setShowModal(false) }}

TICKET DETAILS:
Title: ${ticket.title}
Description: ${ticket.description}
Category: ${ticket.category}
Priority: ${ticket.priority}
Status: ${ticket.status}

ANALYSIS TASKS:
1. EXISTING_IMPLEMENTATION: Check if the requested feature already exists
2. CODE_LOCATION: Identify likely files/components that need to be examined
3. ROOT_CAUSE: Is this a missing feature OR bypassed existing validation?
4. PARENT_CHILD_FLOW: Check if parent components bypass child validation
5. COMPLEXITY: Rate complexity (1-10) and estimated fix time
6. SIMILAR_PATTERNS: Identify if this matches known anti-patterns
7. AUTO_FIXABLE: Determine if this could be automatically fixed
8. SUGGESTED_APPROACH: Fix the real issue (not symptoms)
9. TESTING_STRATEGY: Suggest how to test the fix
10. RELATED_RISKS: Identify potential risks or side effects

Return a structured JSON response with these analysis points.
`

    // Use Claude for analysis with enhanced context
    const analysis = await claude.analyzeCode(
      '', // No specific code content for this type of analysis
      analysisPrompt,
      {
        fileName: 'ticket_analysis',
        language: 'typescript',
        ticketContext: {
          title: ticket.title,
          description: ticket.description,
          category: ticket.category,
          priority: ticket.priority,
          hasScreenshot: !!ticket.screenshot_url,
          screenshotUrl: ticket.screenshot_url
        }
      }
    )

    // Store AI analysis in the database
    const { data: aiAnalysis, error: storeError } = await supabase
      .from('ai_ticket_analysis')
      .insert({
        ticket_id: ticketId,
        analysis_data: analysis,
        model_used: 'claude-3.5-sonnet',
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
