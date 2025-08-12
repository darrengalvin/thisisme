import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { GitHubClient } from '@/lib/github/client'
import { ClaudeClient } from '@/lib/ai/claude-client'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json()
    const { ticketId, repository, title, description, category } = requestBody

    if (!ticketId || !repository) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify JWT token and extract user ID
    const { verifyToken } = await import('@/lib/auth')
    const userInfo = await verifyToken(token)
    
    if (!userInfo) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    // Get ticket details - or create a temporary ticket record for analysis
    let ticket = null
    const { data: existingTicket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single()

    if (existingTicket) {
      ticket = existingTicket
    } else {
      // For demo purposes, create a temporary ticket record if it doesn't exist
      console.log('Ticket not found in database, using mock ticket data')
      
      ticket = {
        id: ticketId,
        title: title || `Analysis Request ${ticketId}`,
        description: description || 'AI-powered analysis request',
        category: category || 'general',
        priority: 'medium',
        status: 'open',
        user_id: userInfo.userId
      }
      
      // Store the ticket for future reference
      try {
        await supabase.from('support_tickets').insert({
          id: ticketId,
          title: ticket.title,
          description: ticket.description,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
          user_id: userInfo.userId,
          created_at: new Date().toISOString()
        })
      } catch (insertError) {
        console.warn('Could not create ticket record:', insertError)
        // Continue with analysis even if ticket creation fails
      }
    }

    const { data: githubConnection } = await supabase
      .from('github_connections')
      .select('access_token')
      .eq('user_id', userInfo.userId)
      .single()

    if (!githubConnection?.access_token) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 })
    }

    // Initialize clients
    const github = new GitHubClient(githubConnection.access_token)
    const claude = new ClaudeClient()

    // Parse repository (format: owner/repo)
    const [owner, repo] = repository.split('/')

    // Search for relevant code based on ticket description
    const searchResults = await github.searchCode(owner, repo, ticket.title)
    
    // Get file contents for analysis
    const filesToAnalyze = []
    for (const result of searchResults.slice(0, 3)) { // Analyze top 3 results
      const fileContent = await github.getFileContent(owner, repo, result.path)
      if (fileContent) {
        filesToAnalyze.push({
          path: result.path,
          content: fileContent.content,
          sha: fileContent.sha
        })
      }
    }

    // If no search results, try to find common problem areas
    if (filesToAnalyze.length === 0) {
      const commonPaths = [
        'app/components/timeline/ChronologicalTimelineView.tsx',
        'app/components/timeline/TimelineView.tsx',
        'components/Timeline.tsx',
        'src/components/Timeline.tsx'
      ]

      for (const path of commonPaths) {
        const fileContent = await github.getFileContent(owner, repo, path)
        if (fileContent) {
          filesToAnalyze.push({
            path,
            content: fileContent.content,
            sha: fileContent.sha
          })
          break
        }
      }
    }

    // Analyze with Claude
    let analysis = null
    if (filesToAnalyze.length > 0) {
      const mainFile = filesToAnalyze[0]
      analysis = await claude.analyzeCode(
        mainFile.content,
        `${ticket.title}\n\n${ticket.description}`,
        {
          fileName: mainFile.path,
          language: mainFile.path.endsWith('.tsx') ? 'typescript' : 'javascript',
          relatedFiles: filesToAnalyze.slice(1)
        }
      )
    } else {
      // Fallback: analyze based on description only
      analysis = {
        rootCause: 'Unable to locate specific code files. Manual investigation required.',
        complexity: 8,
        confidence: 20,
        isAutoFixable: false,
        suggestedFix: {
          description: 'Need to manually locate and examine the relevant code files'
        },
        risks: ['Unable to automatically locate problem code'],
        testingRequired: ['Manual testing required']
      }
    }

    // Store analysis
    const { data: analysisRecord } = await supabase
      .from('ai_analyses')
      .insert({
        ticket_id: ticketId,
        repository,
        files_analyzed: filesToAnalyze.map(f => f.path),
        analysis_data: analysis,
        confidence_score: analysis.confidence || 0,
        complexity_score: analysis.complexity || 10,
        is_auto_fixable: analysis.isAutoFixable || false,
        analyzed_at: new Date().toISOString(),
        analyzed_by: 'claude-3.5-sonnet'
      })
      .select()
      .single()

    return NextResponse.json({
      success: true,
      analysis: analysisRecord,
      filesAnalyzed: filesToAnalyze.map(f => f.path)
    })

  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}