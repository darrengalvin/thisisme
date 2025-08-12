import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { GitHubClient } from '@/lib/github/client'
import { ClaudeClient } from '@/lib/ai/claude-client'

export async function POST(request: NextRequest) {
  try {
    const { ticketId, repository } = await request.json()

    if (!ticketId || !repository) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()
    
    // Get ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Get GitHub connection
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: githubConnection } = await supabase
      .from('github_connections')
      .select('access_token')
      .eq('user_id', user.id)
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