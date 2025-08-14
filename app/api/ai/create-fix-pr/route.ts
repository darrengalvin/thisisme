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
    const { analysisId, autoApply = false } = await request.json()

    if (!analysisId) {
      return NextResponse.json({ error: 'Missing analysis ID' }, { status: 400 })
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
    
    // Get analysis details
    const { data: analysis, error: analysisError } = await supabase
      .from('ai_analyses')
      .select('*')
      .eq('id', analysisId)
      .single()

    if (analysisError || !analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    }

    // Get ticket details separately
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', analysis.ticket_id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
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

    // Parse repository
    const [owner, repo] = analysis.repository.split('/')

    // Generate fix based on analysis
    let suggestedFix = analysis.analysis_data.suggestedFix
    
    // If analysis doesn't have specific code changes, generate them with Claude
    if (!suggestedFix?.codeChanges || suggestedFix.codeChanges.length === 0) {
      console.log('🔧 Analysis missing codeChanges, generating with Claude...')
      
      // Generate specific code changes using Claude based on the analysis
      const codeChangesPrompt = `
Based on this analysis, generate specific code changes to fix the issue:

ANALYSIS:
${JSON.stringify(analysis.analysis_data, null, 2)}

TICKET:
Title: ${ticket.title}
Description: ${ticket.description}

FILES TO ANALYZE: ${analysis.files_analyzed?.join(', ') || 'files not specified'}

Generate specific code changes in this JSON format:
{
  "codeChanges": [
    {
      "file": "path/to/file.tsx",
      "explanation": "what this change does and why"
    }
  ]
}

Focus on the most likely files that need changes based on the analysis.
`

      try {
        const codeChangesResponse = await claude.analyzeCode(
          '', // No specific code content, using general analysis
          codeChangesPrompt,
          {
            fileName: 'code-changes-generation',
            language: 'typescript',
            ticketContext: {
              title: ticket.title,
              description: ticket.description,
              category: ticket.category,
              priority: ticket.priority
            }
          }
        )

        if (codeChangesResponse?.codeChanges) {
          suggestedFix = {
            ...suggestedFix,
            codeChanges: codeChangesResponse.codeChanges
          }
          console.log(`✅ Generated ${codeChangesResponse.codeChanges.length} code changes`)
        } else {
          // Fallback: generate code changes based on analyzed files
          const fallbackChanges = (analysis.files_analyzed || []).map((file: string) => ({
            file,
            explanation: `Apply fix for: ${analysis.analysis_data.rootCause || 'identified issue'}`
          }))
          
          if (fallbackChanges.length > 0) {
            suggestedFix = {
              ...suggestedFix,
              codeChanges: fallbackChanges
            }
            console.log(`🔄 Used fallback: ${fallbackChanges.length} files from analysis`)
          } else {
            return NextResponse.json({ 
              error: 'Unable to generate specific code changes. The analysis may need more specific file information.' 
            }, { status: 400 })
          }
        }
      } catch (error) {
        console.error('Error generating code changes:', error)
        return NextResponse.json({ 
          error: 'Failed to generate specific code changes for this analysis' 
        }, { status: 500 })
      }
    }

    // Create a new branch for the fix (using - instead of / to avoid URL encoding issues)
    const branchName = `ai-fix-${analysis.ticket_id.slice(0, 8)}-${Date.now()}`
    await github.createBranch(owner, repo, branchName)

    // Apply each code change
    const appliedChanges = []
    for (const change of suggestedFix.codeChanges) {
      try {
        // Get current file content - ensure proper path
        let filePath = change.file
        // If file path doesn't include directory and this is a component, add components/ prefix
        if (!filePath.includes('/') && filePath.endsWith('.tsx') && !filePath.startsWith('app/')) {
          filePath = `components/${filePath}`
        }
        console.log(`📁 Looking for file: ${filePath} (original: ${change.file})`)
        
        const currentFile = await github.getFileContent(owner, repo, filePath, branchName)
        
        if (!currentFile) {
          console.warn(`File not found: ${change.file}`)
          continue
        }

        // Generate the complete fixed file
        const fixResponse = await claude.generateFix(
          analysis.analysis_data,
          currentFile.content,
          {
            fileName: change.file,
            language: change.file.endsWith('.tsx') ? 'typescript' : 'javascript',
            projectContext: `Fixing: ${ticket.title}`
          }
        )

        if (fixResponse?.fixedCode) {
          // Update the file using the corrected path
          await github.updateFile(
            owner,
            repo,
            filePath, // Use the corrected path
            fixResponse.fixedCode,
            `Fix: ${change.explanation || 'Apply AI-suggested fix'}`,
            branchName,
            currentFile.sha
          )

          appliedChanges.push({
            file: change.file,
            status: 'applied',
            changes: fixResponse.changes
          })
        }
      } catch (error) {
        console.error(`Failed to apply change to ${change.file}:`, error)
        appliedChanges.push({
          file: change.file,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // AI Code Review - validate the generated fix
    console.log('🔍 Running AI code review on generated fix...')
    const codeReview = await claude.reviewPullRequest(
      `🤖 AI Fix: ${ticket.title}`,
      `Fixing: ${analysis.analysis_data.rootCause}`,
      appliedChanges.filter(c => c.status === 'applied').map(c => ({
        filename: c.file,
        changes: JSON.stringify(c.changes, null, 2),
        additions: c.changes?.length || 1,
        deletions: 0
      }))
    )

    // Generate test cases for the fix
    console.log('🧪 Generating test cases...')
    const testGeneration = await claude.generateFix(
      {
        ...analysis.analysis_data,
        generateTests: true,
        testingFramework: 'jest + react-testing-library'
      },
      '', // No base code needed for test generation
      {
        fileName: 'test-generation',
        language: 'typescript',
        projectContext: `Generate tests for: ${ticket.title}`
      }
    )

    // Create pull request
    const prTitle = `🤖 AI Fix: ${ticket.title}`
    const prBody = `## 🤖 AI-Generated Fix

### 🛡️ Safety Validation
- **Code Review Score:** ${codeReview?.overallScore || 'N/A'}/10
- **Risk Level:** ${codeReview?.riskLevel || 'Unknown'} ${codeReview?.riskLevel === 'low' ? '🟢' : codeReview?.riskLevel === 'medium' ? '🟡' : '🔴'}
- **Security Issues:** ${codeReview?.securityIssues?.length || 0} found
- **Performance Issues:** ${codeReview?.performanceIssues?.length || 0} found
- **AI Approved:** ${codeReview?.approved ? '✅ Yes' : '❌ No'}

${codeReview?.securityIssues?.length > 0 ? `
### 🔒 Security Concerns
${codeReview.securityIssues.map((issue: string) => `- ⚠️ ${issue}`).join('\n')}
` : ''}

${codeReview?.performanceIssues?.length > 0 ? `
### ⚡ Performance Concerns  
${codeReview.performanceIssues.map((issue: string) => `- ⚠️ ${issue}`).join('\n')}
` : ''}

${codeReview?.suggestions?.length > 0 ? `
### 💡 AI Suggestions
${codeReview.suggestions.map((suggestion: string) => `- ${suggestion}`).join('\n')}
` : ''}

### 🧪 Generated Test Cases
${testGeneration?.testCode ? `
\`\`\`typescript
${testGeneration.testCode}
\`\`\`
` : 'No test cases generated - manual testing required'}

### Issue
**Ticket ID:** ${analysis.ticket_id}
**Title:** ${ticket.title}
**Description:** ${ticket.description}

### Analysis
- **Root Cause:** ${analysis.analysis_data.rootCause}
- **Complexity:** ${analysis.analysis_data.complexity}/10
- **Confidence:** ${analysis.analysis_data.confidence}%
- **Auto-Fixable:** ${analysis.analysis_data.isAutoFixable ? 'Yes' : 'No'}

### Changes Applied
${appliedChanges.map(c => `- ${c.status === 'applied' ? '✅' : '❌'} ${c.file}`).join('\n')}

### Suggested Fix
${analysis.analysis_data.suggestedFix.description}

### Risks
${analysis.analysis_data.risks?.map((r: string) => `- ⚠️ ${r}`).join('\n') || 'No significant risks identified'}

### Testing Required
${analysis.analysis_data.testingRequired?.map((t: string) => `- [ ] ${t}`).join('\n') || '- [ ] Standard testing procedures'}

---
*This PR was automatically generated by the AI Support System using Claude 3.5 Sonnet*
*Please review carefully before merging*`

    const pr = await github.createPullRequest(
      owner,
      repo,
      prTitle,
      prBody,
      branchName
    )

    // Store PR information with validation results
    const { data: fixRecord } = await supabase
      .from('ai_fixes')
      .insert({
        analysis_id: analysisId,
        ticket_id: analysis.ticket_id,
        pr_number: pr.number,
        pr_url: pr.html_url,
        branch_name: branchName,
        files_changed: appliedChanges.map(c => c.file),
        changes_applied: appliedChanges,
        status: codeReview?.approved ? 'pending_review' : 'needs_attention',
        validation_results: {
          codeReview,
          testGeneration: testGeneration?.testCode ? 'generated' : 'manual_required',
          riskLevel: codeReview?.riskLevel || 'unknown',
          securityIssues: codeReview?.securityIssues?.length || 0,
          performanceIssues: codeReview?.performanceIssues?.length || 0,
          overallScore: codeReview?.overallScore || 0
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    // Update ticket status
    await supabase
      .from('tickets')
      .update({
        status: 'in_progress',
        metadata: {
          ...ticket.metadata,
          ai_pr_url: pr.html_url,
          ai_pr_number: pr.number
        }
      })
      .eq('id', analysis.ticket_id)

    return NextResponse.json({
      success: true,
      pr: {
        number: pr.number,
        url: pr.html_url,
        branch: branchName
      },
      fix: fixRecord,
      appliedChanges,
      validation: {
        codeReview,
        testGeneration: testGeneration?.testCode || null,
        riskAssessment: {
          level: codeReview?.riskLevel || 'unknown',
          approved: codeReview?.approved || false,
          score: codeReview?.overallScore || 0,
          securityIssues: codeReview?.securityIssues?.length || 0,
          performanceIssues: codeReview?.performanceIssues?.length || 0
        },
        recommendations: {
          autoMerge: codeReview?.approved && (codeReview?.overallScore || 0) >= 8 && codeReview?.riskLevel === 'low',
          requiresManualReview: !codeReview?.approved || (codeReview?.securityIssues?.length || 0) > 0,
          stagingTestRequired: true
        }
      }
    })

  } catch (error) {
    console.error('Fix PR creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create fix PR', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}