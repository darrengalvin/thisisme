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
    const { ticketId, repository, title: requestTitle, description: requestDescription, category } = requestBody

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
      .from('tickets')
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
        title: requestTitle || `Analysis Request ${ticketId}`,
        description: requestDescription || 'AI-powered analysis request',
        category: category || 'general',
        priority: 'medium',
        status: 'open',
        user_id: userInfo.userId
      }
      
      // Store the ticket for future reference
      try {
        await supabase.from('tickets').insert({
          id: ticketId,
          title: ticket.title,
          description: ticket.description,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
          creator_id: userInfo.userId,
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

    // Improved code search logic - search for relevant components based on ticket content
    const filesToAnalyze = []
    
    // Visual-guided component mapping
    const getComponentsFromVisualContext = (ticket: any): string[] => {
      const components = []
      const title = ticket.title.toLowerCase()
      const description = ticket.description.toLowerCase()
      const combinedText = `${title} ${description}`
      
      // If screenshot provided, prioritize based on visual context
      if (ticket.screenshot_url) {
        console.log('📸 Using screenshot for component guidance:', ticket.screenshot_url)
        
        // Enhanced visual context hints for component mapping
        if (combinedText.includes('chapter')) {
          // Main chapters grid/list view (what user primarily sees)
          components.push('components/GroupManager.tsx')
          
          // Timeline and chronological views  
          if (combinedText.includes('chronological') || combinedText.includes('timeline') || combinedText.includes('order') || combinedText.includes('sort')) {
            components.push('components/TimelineView.tsx', 'components/ChronologicalTimelineView.tsx')
          }
          
          // Memory views within chapters
          if (combinedText.includes('memory') || combinedText.includes('memories')) {
            components.push('components/MemoryViews.tsx', 'components/MemoryCard.tsx')
          }
        }
        if (combinedText.includes('modal') || combinedText.includes('edit')) {
          components.push('components/EditChapterModal.tsx')
        }
        if (combinedText.includes('dashboard') || combinedText.includes('home')) {
          components.push('components/Dashboard.tsx')
        }
      }
      
      return components
    }
    
    // Define search strategies based on ticket content and type
    const searchStrategies = []
    
    const title = ticket.title.toLowerCase()
    const description = ticket.description.toLowerCase()
    const combinedText = `${title} ${description}`
    
    // Strategy 0: Visual-guided component selection (highest priority)
    const visualGuidedComponents = getComponentsFromVisualContext(ticket)
    if (visualGuidedComponents.length > 0) {
      searchStrategies.push({ 
        query: 'visual-guided component analysis', 
        paths: visualGuidedComponents,
        priority: 'highest'
      })
    }
    
    // Strategy 1: Search for specific components mentioned in ticket
    // PRIORITY: Chronological/sorting issues should target timeline views, not modals
    if ((combinedText.includes('chronological') || combinedText.includes('timeline') || combinedText.includes('sorting') || combinedText.includes('order')) && combinedText.includes('chapter')) {
      searchStrategies.push({ query: 'chronological timeline chapter sorting', paths: ['components/TimelineView.tsx', 'components/ChronologicalTimelineView.tsx'] })
    }
    else if (combinedText.includes('chapter') && (combinedText.includes('edit') || combinedText.includes('modal') || combinedText.includes('close') || combinedText.includes('save'))) {
      searchStrategies.push({ query: 'chapter edit modal', paths: ['components/EditChapterModal.tsx', 'components/CreateMemory.tsx'] })
    }
    else if (combinedText.includes('chronological') || combinedText.includes('timeline')) {
      searchStrategies.push({ query: 'chronological timeline', paths: ['components/ChronologicalTimelineView.tsx', 'components/TimelineView.tsx'] })
    }
    if (combinedText.includes('modal') || combinedText.includes('close') || combinedText.includes('save')) {
      searchStrategies.push({ query: 'modal save changes', paths: ['components/EditMemoryModal.tsx', 'components/ViewMemoryModal.tsx'] })
    }
    if (combinedText.includes('memory') || combinedText.includes('create')) {
      searchStrategies.push({ query: 'create memory', paths: ['components/CreateMemory.tsx', 'components/MemoryCard.tsx'] })
    }
    if (combinedText.includes('view') || combinedText.includes('dropdown') || combinedText.includes('toggle')) {
      searchStrategies.push({ query: 'view dropdown toggle', paths: ['components/MemoryViews.tsx', 'components/Dashboard.tsx'] })
    }
    
    // Strategy 2: Try specific file paths first
    for (const strategy of searchStrategies) {
      for (const path of strategy.paths) {
        try {
          const fileContent = await github.getFileContent(owner, repo, path)
          if (fileContent) {
            filesToAnalyze.push({
              path,
              content: fileContent.content,
              sha: fileContent.sha,
              relevance: 'direct_match'
            })
          }
        } catch (error) {
          // File doesn't exist, continue
        }
      }
    }
    
    // Strategy 3: GitHub code search for relevant terms
    if (filesToAnalyze.length < 3) {
      try {
        const searchTerms = [ticket.title, ...searchStrategies.map(s => s.query)]
        for (const term of searchTerms.slice(0, 2)) { // Limit searches
          const searchResults = await github.searchCode(owner, repo, term)
          
          for (const result of searchResults.slice(0, 2)) {
            // Skip if we already have this file
            if (filesToAnalyze.some(f => f.path === result.path)) continue
            
            const fileContent = await github.getFileContent(owner, repo, result.path)
            if (fileContent) {
              filesToAnalyze.push({
                path: result.path,
                content: fileContent.content,
                sha: fileContent.sha,
                relevance: 'search_match'
              })
            }
          }
        }
      } catch (error) {
        console.warn('GitHub search failed:', error)
      }
    }
    
    // Strategy 4: Anti-pattern detection (find bypassed validation)
    if (filesToAnalyze.length < 5) {
      const antiPatterns = [
        'onClose={() => {',
        'setShowEditModal(false)',
        'setEditingChapter(null)',
        'handleClose',
        'hasUnsavedChanges',
        'showUnsavedWarning'
      ]
      
      for (const pattern of antiPatterns) {
        try {
          const results = await github.searchCode(owner, repo, pattern)
          if (results && Array.isArray(results)) {
            for (const item of results.slice(0, 2)) {
              if (item.path.startsWith('components/') && item.path.endsWith('.tsx')) {
                try {
                  const fileContent = await github.getFileContent(owner, repo, item.path)
                  if (fileContent && !filesToAnalyze.some(f => f.path === item.path)) {
                    filesToAnalyze.push({
                      path: item.path,
                      content: fileContent.content,
                      sha: fileContent.sha,
                      relevance: 'anti_pattern_detection'
                    })
                  }
                } catch (error) {
                  // Continue if file can't be fetched
                }
              }
            }
          }
        } catch (error) {
          console.warn(`Anti-pattern search failed for "${pattern}":`, error)
        }
      }
    }
    
    // Strategy 5: Text-based component search (search for UI text in code)
    if (filesToAnalyze.length < 5) {
      const searchTexts = [
        'Life Chapters',
        'organise and edit your life story',
        'chapters.map',
        'chapters.sort',
        ticket.title.split(' ').slice(0, 3).join(' ') // First few words of ticket title
      ]
      
      for (const searchText of searchTexts) {
        try {
          const results = await github.searchCode(owner, repo, searchText)
          if (results && Array.isArray(results)) {
            for (const item of results.slice(0, 2)) {
              if (item.path.startsWith('components/') && item.path.endsWith('.tsx')) {
                try {
                  const fileContent = await github.getFileContent(owner, repo, item.path)
                  if (fileContent && !filesToAnalyze.some(f => f.path === item.path)) {
                    filesToAnalyze.push({
                      path: item.path,
                      content: fileContent.content,
                      sha: fileContent.sha,
                      relevance: 'text_search'
                    })
                  }
                } catch (error) {
                  // Continue if file can't be fetched
                }
              }
            }
          }
        } catch (error) {
          console.warn(`Text search failed for "${searchText}":`, error)
        }
      }
    }
    
    // Strategy 6: Fallback to common memory app components (architectural priority)
    if (filesToAnalyze.length === 0) {
      const fallbackPaths = [
        'components/EditChapterModal.tsx',    // High priority - has validation patterns
        'components/EditMemoryModal.tsx',     // High priority - has validation patterns  
        'components/ChronologicalTimelineView.tsx', // Modal parent component
        'components/TimelineView.tsx',        // Modal parent component
        'components/GroupManager.tsx',        // Main chapters grid view
        'components/Dashboard.tsx',           // Main app layout
        'components/CreateMemory.tsx',
        'components/MemoryCard.tsx',
        'components/MemoryViews.tsx',
        'app/page.tsx'
      ]

      for (const path of fallbackPaths) {
        try {
          const fileContent = await github.getFileContent(owner, repo, path)
          if (fileContent) {
            filesToAnalyze.push({
              path,
              content: fileContent.content,
              sha: fileContent.sha,
              relevance: 'fallback'
            })
            if (filesToAnalyze.length >= 2) break // Limit fallback files
          }
        } catch (error) {
          // File doesn't exist, continue
        }
      }
    }

    // Analyze with Claude using enhanced context
    let analysis = null
    if (filesToAnalyze.length > 0) {
      const mainFile = filesToAnalyze[0]
      
      // Enhanced context about the memory sharing application
      const appContext = `
MEMORY SHARING APPLICATION CONTEXT:
- This is a Next.js memory sharing app where users create, edit, and view memories
- Key components: memories, chapters, timelines, modals, views (grid/timeline/feed)
- Users can create memories with images, organize them in chapters, and view chronologically
- The app uses TypeScript/React with Supabase backend
- Key UI patterns: modals for editing, timeline views for chronological display, save/cancel workflows

CRITICAL ANALYSIS REQUIREMENTS:
- You MUST describe exactly what you see in the code with specific examples
- Include actual code snippets with line numbers when found
- For sorting issues: show the current sort logic and explain why it's broken
- For UI issues: describe the current rendering and what's wrong
- Example: "Line 338: if (!a.startDate || !b.startDate) return 0 - this breaks sorting!"
- Example: "I can see chapters rendering as: testing(2000), test(1995), UNI(1995) - wrong order!"

FILES ANALYZED (${filesToAnalyze.length}):
${filesToAnalyze.map((f, i) => `${i + 1}. ${f.path} (${f.relevance})`).join('\n')}

TICKET DETAILS:
Title: ${ticket.title}
Description: ${ticket.description}
Category: ${ticket.category}
Priority: ${ticket.priority}
`

             // Enhanced analysis with screenshot context
       const visualContext = ticket.screenshot_url ? `
VISUAL CONTEXT & COMPONENT MAPPING:
- Screenshot provided: ${ticket.screenshot_url}
- CRITICAL: Describe exactly what you see in the screenshot
- Match visible UI elements to code components:
  * Grid of chapters with titles/dates = GroupManager.tsx
  * Timeline with memories = TimelineView.tsx or ChronologicalTimelineView.tsx
  * Modal dialogs = EditChapterModal.tsx
  * Dashboard layout = Dashboard.tsx
- Look for specific text like "Life Chapters", "organise and edit", chapter titles
- Identify the MAIN component the user is interacting with
- Don't just analyze the obvious files - find ALL components that render the visible UI

CRITICAL ANALYSIS REQUIREMENTS:
- Look for EXISTING implementations before suggesting new ones
- Check if the reported issue already has safeguards that aren't working
- Analyze the complete component interaction flow (parent → child → handler)
- Don't assume the obvious component is broken - check HOW it's being called
- Look for bypassed validation or incorrect event handling

CODEBASE ARCHITECTURAL PATTERNS TO RECOGNIZE:
1. Modal Pattern: Components like EditChapterModal have built-in handleClose() functions with validation
2. Parent-Child Pattern: Parent components often bypass child validation by calling onClose directly
3. State Management: Modal state managed by parent (showEditModal, setShowEditModal)
4. Common Anti-Pattern: onClose={() => { setShowModal(false); setEditing(null) }} bypasses validation
5. Correct Pattern: onClose={handleClose} or onClose={() => modalRef.current?.handleClose()}

SPECIFIC VALIDATION PATTERNS IN THIS CODEBASE:
- EditChapterModal has: hasUnsavedChanges, handleClose(), showUnsavedWarning, autosave
- EditMemoryModal has: handleClose() with loading state checks
- Modal components typically have their own close handling logic
- Parent components should NOT directly manipulate modal state if validation exists

DEBUGGING APPROACH:
1. First check if the target component already has the requested feature
2. If feature exists, trace how parent components interact with it
3. Look for direct state manipulation that bypasses component methods
4. Check for missing function calls (handleClose vs direct onClose)
5. Verify event handler wiring between parent and child components
` : ''

             // ENHANCED: Collect pattern analysis data
      const similarComponents = []
      const existingHooks = []
      const parentComponents = []
      
      // Find similar modal components for pattern analysis - ensure we have complete files
      const modalFiles = filesToAnalyze.filter(f => 
        f.path.includes('Modal.tsx') || 
        (f.content.includes('onClose') && f.content.includes('useState') && f.path.includes('components/'))
      )
      
      // If we don't have enough modal files, fetch them explicitly
      if (modalFiles.length < 3) {
        const criticalModalPaths = [
          'components/EditChapterModal.tsx',
          'components/EditMemoryModal.tsx', 
          'components/CreateMemory.tsx'
        ]
        
        for (const modalPath of criticalModalPaths) {
          if (!filesToAnalyze.some(f => f.path === modalPath)) {
            try {
              const modalContent = await github.getFileContent(owner, repo, modalPath)
              if (modalContent) {
                filesToAnalyze.push({
                  path: modalPath,
                  content: modalContent.content,
                  sha: modalContent.sha,
                  relevance: 'critical_modal'
                })
                modalFiles.push({
                  path: modalPath,
                  content: modalContent.content,
                  sha: modalContent.sha,
                  relevance: 'critical_modal'
                })
              }
            } catch (error) {
              console.warn(`Could not fetch critical modal: ${modalPath}`)
            }
          }
        }
      }
      
      for (const modalFile of modalFiles) {
        const patterns = []
        if (modalFile.content.includes('hasUnsavedChanges')) patterns.push('unsaved-changes-detection')
        if (modalFile.content.includes('handleClose')) patterns.push('close-handler')
        if (modalFile.content.includes('showUnsavedWarning')) patterns.push('unsaved-warning')
        if (modalFile.content.includes('autosave')) patterns.push('autosave')
        if (modalFile.content.includes('useEffect')) patterns.push('lifecycle-hooks')
        
        similarComponents.push({
          path: modalFile.path,
          content: modalFile.content,
          patterns
        })
      }
      
      // Find existing hooks that might be relevant
      const hookFiles = filesToAnalyze.filter(f => 
        f.path.includes('hooks/') || 
        f.content.includes('use') && f.content.includes('export')
      )
      
      for (const hookFile of hookFiles) {
        let purpose = 'unknown'
        if (hookFile.content.includes('unsaved')) purpose = 'unsaved-changes-management'
        if (hookFile.content.includes('form')) purpose = 'form-management'
        if (hookFile.content.includes('modal')) purpose = 'modal-management'
        
        existingHooks.push({
          path: hookFile.path,
          content: hookFile.content,
          purpose
        })
      }
      
      // Find parent components that use the target component
      if (mainFile.path.includes('Modal.tsx')) {
        const componentName = mainFile.path.split('/').pop()?.replace('.tsx', '') || ''
        const parentFiles = filesToAnalyze.filter(f => 
          f.content.includes(componentName) && f.path !== mainFile.path
        )
        
        for (const parentFile of parentFiles) {
          let usage = 'unknown'
          if (parentFile.content.includes(`${componentName}.*onClose.*{.*}`)) usage = 'direct-state-bypass'
          if (parentFile.content.includes(`${componentName}.*onClose.*handleClose`)) usage = 'proper-handler'
          
          parentComponents.push({
            path: parentFile.path,
            content: parentFile.content,
            usage
          })
        }
      }

      analysis = await claude.analyzeCode(
        mainFile.content,
        appContext + visualContext,
        {
          fileName: mainFile.path,
          language: mainFile.path.endsWith('.tsx') ? 'typescript' : 'javascript',
          relatedFiles: filesToAnalyze.slice(1),
          similarComponents,
          existingHooks,
          parentComponents,
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
      
      // Enhance analysis with specific guidance
      if (analysis) {
        // Add app-specific complexity assessment
        if (ticket.title.toLowerCase().includes('chronological') || ticket.title.toLowerCase().includes('sort')) {
          analysis.complexity = Math.min(analysis.complexity || 5, 4) // Sorting is usually not too complex
        }
        if (ticket.title.toLowerCase().includes('modal') && ticket.title.toLowerCase().includes('save')) {
          analysis.complexity = Math.min(analysis.complexity || 5, 3) // Save confirmation is straightforward
        }
        
        // Improve confidence based on file relevance
        const hasDirectMatch = filesToAnalyze.some(f => f.relevance === 'direct_match')
        if (hasDirectMatch && analysis.confidence < 70) {
          analysis.confidence = Math.min(analysis.confidence + 20, 90)
        }
      }
    } else {
      // Enhanced fallback analysis with app context
      analysis = {
        rootCause: `Unable to locate specific code files for "${ticket.title}". This could be because:
1. The files might be in a different location than expected
2. The feature might not be implemented yet
3. The component names might be different
4. The GitHub repository might not have the latest code`,
        complexity: 6,
        confidence: 25,
        isAutoFixable: false,
        suggestedFix: {
          description: `Manual investigation needed. Based on the ticket "${ticket.title}", look for:
- Modal/dialog components if this involves UI interactions
- Timeline/chronological components if this involves date sorting
- Memory creation/editing components if this involves user content
- Chapter-related components if this involves chapter functionality`,
          codeChanges: [
            {
              file: 'Manual search required',
              explanation: 'Search the codebase for relevant component files'
            }
          ]
        },
        risks: ['Unable to automatically locate problem code', 'Analysis may be incomplete without file context'],
        testingRequired: ['Manual testing required', 'Test all related user workflows']
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

    const searchStrategy = ticket.screenshot_url 
      ? `🖼️ Visual-guided analysis: Found ${filesToAnalyze.length} files using screenshot context`
      : `Found ${filesToAnalyze.length} relevant files using intelligent search`

    // Add analysis context summary for debugging  
    const analysisContext = `
    ANALYSIS SUMMARY:
    - Files analyzed: ${filesToAnalyze.length}
    - Visual context: ${ticket.screenshot_url ? 'YES' : 'NO'}
    - Anti-pattern detection: ${filesToAnalyze.filter(f => f.relevance === 'anti_pattern_detection').length} files
    - Component mapping: ${filesToAnalyze.filter(f => f.relevance === 'visual_mapping').length} files
    - Text search: ${filesToAnalyze.filter(f => f.relevance === 'text_search').length} files
    - Search matches: ${filesToAnalyze.filter(f => f.relevance === 'search_match').length} files
    - Fallback files: ${filesToAnalyze.filter(f => f.relevance === 'fallback').length} files
    
    KEY PATTERNS TO CHECK:
    - Look for existing handleClose() methods
    - Check parent components for onClose={() => setShow...} patterns  
    - Verify if validation is being bypassed
    - Analyze component interaction flow
    `

    return NextResponse.json({
      success: true,
      analysis: {
        ...analysisRecord,
        files_analyzed: filesToAnalyze.map(f => f.path),
        analysis_data: analysis,
        context_summary: analysisContext
      },
      filesAnalyzed: filesToAnalyze.map(f => f.path),
      searchStrategy,
      hasScreenshot: !!ticket.screenshot_url,
      screenshotUrl: ticket.screenshot_url,
      fileRelevance: filesToAnalyze.map(f => ({ path: f.path, relevance: f.relevance })),
      analysisQuality: {
        totalFiles: filesToAnalyze.length,
        hasVisualContext: !!ticket.screenshot_url,
        hasAntiPatternDetection: filesToAnalyze.some(f => f.relevance === 'anti_pattern_detection'),
        modalComponentsFound: filesToAnalyze.filter(f => f.path.includes('Modal')).length,
        parentComponentsFound: filesToAnalyze.filter(f => f.path.includes('Timeline') || f.path.includes('Dashboard')).length
      }
    })

  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}