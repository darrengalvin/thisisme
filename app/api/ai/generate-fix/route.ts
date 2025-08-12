import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { promises as fs } from 'fs'
import { join } from 'path'

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
        { error: 'AI fix generation service not configured' },
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

    const { ticketId, targetFiles } = await request.json()
    
    // Fetch ticket and analysis
    const { data: ticket } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single()

    const { data: analysis } = await supabase
      .from('ai_ticket_analysis')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('analyzed_at', { ascending: false })
      .limit(1)
      .single()

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Read relevant source files
    const codeContext = []
    const filesToAnalyze = targetFiles || [
      'components/ChronologicalTimelineView.tsx',
      'components/TimelineView.tsx', 
      'components/MemoryViews.tsx'
    ]

    for (const filePath of filesToAnalyze) {
      try {
        const fullPath = join(process.cwd(), filePath)
        const content = await fs.readFile(fullPath, 'utf-8')
        codeContext.push({
          file: filePath,
          content: content.substring(0, 10000) // Limit content size
        })
      } catch (error) {
        console.log(`Could not read ${filePath}:`, error)
      }
    }

    // Generate fix using AI
    const fixPrompt = `
ISSUE TO FIX:
Title: ${ticket.title}
Description: ${ticket.description}
Category: ${ticket.category}

PREVIOUS ANALYSIS:
${analysis ? JSON.stringify(analysis.analysis_data, null, 2) : 'No previous analysis'}

CURRENT CODE CONTEXT:
${codeContext.map(ctx => 
  `FILE: ${ctx.file}\n\`\`\`typescript\n${ctx.content}\n\`\`\``
).join('\n\n')}

TASK:
Generate a complete fix for this issue. Provide:

1. DIAGNOSIS: Exact problem identified in the code
2. FIX_STRATEGY: Step-by-step approach
3. CODE_CHANGES: Specific code modifications needed
4. FILES_MODIFIED: List of files that need changes
5. TESTING_APPROACH: How to verify the fix works
6. DEPLOYMENT_NOTES: Any special deployment considerations
7. ROLLBACK_PLAN: How to undo if issues arise

Focus on the chronological sorting issue if that's the problem. Look for sorting logic, date handling, or timeline ordering functions.

Return structured JSON with the complete fix plan.
`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a senior software engineer specializing in React/Next.js applications. You generate precise, tested fixes for bugs. Always consider edge cases and provide comprehensive solutions."
        },
        {
          role: "user",
          content: fixPrompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    })

    const fixPlan = JSON.parse(completion.choices[0].message.content || '{}')

    // Store the generated fix plan
    const { data: storedFix, error: storeError } = await supabase
      .from('ai_generated_fixes')
      .insert({
        ticket_id: ticketId,
        fix_plan: fixPlan,
        code_context_files: filesToAnalyze,
        model_used: 'gpt-4o',
        generated_at: new Date().toISOString(),
        generated_by: userInfo.userId,
        status: 'pending_review'
      })
      .select()
      .single()

    if (storeError) {
      console.error('Error storing fix plan:', storeError)
    }

    return NextResponse.json({
      success: true,
      ticket,
      fixPlan,
      fixId: storedFix?.id,
      confidence: calculateConfidence(fixPlan),
      recommendations: {
        autoApplyable: shouldAutoApply(fixPlan),
        requiresHumanReview: requiresReview(fixPlan),
        estimatedRisk: assessRisk(fixPlan)
      }
    })

  } catch (error) {
    console.error('Error generating fix:', error)
    return NextResponse.json(
      { error: 'Failed to generate fix', details: error },
      { status: 500 }
    )
  }
}

function calculateConfidence(fixPlan: any): number {
  // Calculate confidence based on fix plan completeness and specificity
  let score = 0
  if (fixPlan.DIAGNOSIS) score += 20
  if (fixPlan.CODE_CHANGES) score += 30
  if (fixPlan.TESTING_APPROACH) score += 20
  if (fixPlan.FILES_MODIFIED?.length > 0) score += 15
  if (fixPlan.ROLLBACK_PLAN) score += 15
  return score
}

function shouldAutoApply(fixPlan: any): boolean {
  // Determine if fix is safe for auto-application
  const safePatterns = [
    'sorting', 'display order', 'css styling', 'text changes'
  ]
  const riskPatterns = [
    'database', 'authentication', 'payment', 'security'
  ]
  
  const description = JSON.stringify(fixPlan).toLowerCase()
  const hasSafePattern = safePatterns.some(pattern => description.includes(pattern))
  const hasRiskPattern = riskPatterns.some(pattern => description.includes(pattern))
  
  return hasSafePattern && !hasRiskPattern
}

function requiresReview(fixPlan: any): boolean {
  return !shouldAutoApply(fixPlan)
}

function assessRisk(fixPlan: any): 'low' | 'medium' | 'high' {
  const filesCount = fixPlan.FILES_MODIFIED?.length || 0
  const description = JSON.stringify(fixPlan).toLowerCase()
  
  if (description.includes('database') || description.includes('auth')) return 'high'
  if (filesCount > 3) return 'medium'
  return 'low'
}
