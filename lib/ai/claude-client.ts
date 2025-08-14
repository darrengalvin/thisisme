import Anthropic from '@anthropic-ai/sdk'

export class ClaudeClient {
  private client: Anthropic

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is required')
    }
    
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })
  }

  async analyzeCode(
    code: string, 
    issue: string, 
    context?: { 
      fileName?: string
      language?: string
      relatedFiles?: Array<{ path: string; content: string }>
      similarComponents?: Array<{ path: string; content: string; patterns: string[] }>
      existingHooks?: Array<{ path: string; content: string; purpose: string }>
      parentComponents?: Array<{ path: string; content: string; usage: string }>
      ticketContext?: {
        title: string
        description: string
        category: string
        priority: string
        hasScreenshot?: boolean
        screenshotUrl?: string
      }
    }
  ) {
    const systemPrompt = `You are an expert software engineer specialized in React/TypeScript and Next.js applications. You understand memory sharing applications, user experience patterns, and modern web development practices.

    IMPORTANT CONTEXT: You're analyzing code for a memory sharing application where users create, edit, and organize personal memories. This includes:
    - Memory creation/editing workflows with modals
    - Timeline and chronological views of memories
    - Chapter organization systems
    - Save/cancel user interaction patterns
    - Modern React component patterns with TypeScript

    Analyze the provided code and issue with EXTREME thoroughness:

    CRITICAL ANALYSIS STEPS:
    1. COMPLETE FILE REVIEW: Read and analyze EVERY provided file completely, not just snippets
    2. EXISTING IMPLEMENTATION DETECTION: Search for existing solutions BEFORE suggesting new ones
    3. PATTERN CONSISTENCY AUDIT: Compare ALL similar components to identify inconsistencies
    4. PARENT COMPONENT BYPASS ANALYSIS: Look for parent components that bypass child validation
    5. ROOT CAUSE DETERMINATION: Is this missing functionality or broken integration?
    
    COMPREHENSIVE ANALYSIS REQUIREMENTS:
    6. ARCHITECTURAL OPPORTUNITY: Identify reusable patterns and DRY violations
    7. COMPLETE USER JOURNEY: Browser navigation, form validation, autosave conflicts
    8. CROSS-COMPONENT IMPACT: How does this affect ALL similar components?
    9. EDGE CASE COVERAGE: Network failures, partial saves, concurrent edits
    10. IMPLEMENTATION COMPLETENESS: Ensure the fix addresses the ENTIRE problem
    
    CRITICAL: Respond ONLY with valid JSON. Do not include explanations, markdown, or code blocks. Start your response immediately with the opening brace {.
    
    Respond in JSON format with the following structure:
    {
      "rootCause": "detailed description of the actual root cause with line numbers if identifiable",
      "fileAnalysisResults": {
        "completedFiles": ["list of files that were fully analyzed"],
        "existingImplementations": [
          {
            "file": "filename",
            "hasFeature": true,
            "implementation": "description of how it's implemented",
            "completeness": "complete|partial|broken|missing"
          }
        ],
        "patternInconsistencies": [
          {
            "issue": "description of inconsistency",
            "affectedFiles": ["files with different approaches"],
            "impact": "user experience impact"
          }
        ]
      },
      "parentComponentAnalysis": {
        "bypassDetected": true,
        "bypassMethods": ["direct onClose calls", "state manipulation"],
        "affectedParents": ["list of parent components bypassing validation"]
      },
      "actualIssue": "explain why existing safeguards aren't working or what's being bypassed",
      "architecturalRecommendation": {
        "approach": "component-specific|reusable-hook|utility-function|architectural-change",
        "reasoning": "why this approach is best for the codebase",
        "futureProofing": "how this prevents similar issues"
      },
      "complexity": 1-10,
      "confidence": 0-100,
      "isAutoFixable": boolean,
      "suggestedFix": {
        "description": "clear description of what needs to be changed and why (focus on the real issue)",
        "codeChanges": [
          {
            "file": "filename",
            "lineStart": number,
            "lineEnd": number,
            "oldCode": "original code",
            "newCode": "fixed code",
            "explanation": "detailed explanation of why this change solves the actual issue"
          }
        ],
        "newFiles": [
          {
            "path": "path/to/new/file.ts",
            "content": "complete file content for new utilities/hooks",
            "purpose": "why this new file is needed"
          }
        ]
      },
      "crossComponentImpact": ["how this affects other parts of the application"],
      "userJourneyProtection": ["browser navigation, form validation, autosave conflicts, etc."],
      "risks": ["potential UX/functionality risks"],
      "testingRequired": ["specific user scenarios to test including edge cases"]
    }`

    const userPrompt = `
    Issue Description: ${issue}
    
    ${context?.fileName ? `Primary File: ${context.fileName}` : ''}
    ${context?.language ? `Language: ${context.language}` : ''}
    
    ${code ? `
    Primary Code to Analyze:
    \`\`\`${context?.language || ''}
    ${code}
    \`\`\`
    ` : ''}
    
    ${context?.similarComponents ? `
    SIMILAR COMPONENTS FOR PATTERN ANALYSIS:
    ${context.similarComponents.map(c => `
    File: ${c.path}
    Detected Patterns: ${c.patterns.join(', ')}
    \`\`\`
    ${c.content}
    \`\`\`
    `).join('\n')}
    ` : ''}
    
    ${context?.existingHooks ? `
    EXISTING HOOKS/UTILITIES:
    ${context.existingHooks.map(h => `
    File: ${h.path}
    Purpose: ${h.purpose}
    \`\`\`
    ${h.content}
    \`\`\`
    `).join('\n')}
    ` : ''}
    
    ${context?.parentComponents ? `
    PARENT COMPONENTS (check for bypass patterns):
    ${context.parentComponents.map(p => `
    File: ${p.path}
    Usage Context: ${p.usage}
    \`\`\`
    ${p.content}
    \`\`\`
    `).join('\n')}
    ` : ''}
    
    ${context?.relatedFiles ? `
    RELATED FILES:
    ${context.relatedFiles.map(f => `
    File: ${f.path}
    \`\`\`
    ${f.content}
    \`\`\`
    `).join('\n')}
    ` : ''}
    
    MANDATORY ANALYSIS PROTOCOL:
    
    STEP 1 - COMPLETE FILE ANALYSIS:
    - Read EVERY line of EVERY provided file
    - Document what unsaved changes protection EXISTS in each file
    - Identify which files have complete/partial/missing implementations
    
    STEP 2 - PATTERN DETECTION:
    - Compare how each modal component handles unsaved changes
    - Identify inconsistencies between similar components
    - Document which approach is most complete
    
    STEP 3 - PARENT COMPONENT AUDIT:
    - Search for parent components that use these modals
    - Look for direct onClose={() => setShowModal(false)} patterns
    - Identify if parents bypass child component validation
    
    STEP 4 - ROOT CAUSE ANALYSIS:
    - Is this missing functionality OR existing functionality being bypassed?
    - What is the ACTUAL problem preventing the feature from working?
    
    STEP 5 - COMPREHENSIVE SOLUTION:
    - Address the real root cause, not symptoms
    - Ensure solution works across ALL similar components
    - Include browser navigation protection and edge cases
    
    FAILURE TO FOLLOW THIS PROTOCOL WILL RESULT IN INCOMPLETE ANALYSIS.
    `

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      temperature: 0.3, // Slightly more creative for natural conversations
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    })

    const content = response.content[0]
    if (content.type === 'text') {
      try {
        let responseText = content.text.trim()
        
        // Try to extract JSON from markdown code blocks if present
        const jsonBlockMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
        if (jsonBlockMatch) {
          responseText = jsonBlockMatch[1]
        }
        
        // Remove any leading/trailing text before/after JSON
        const jsonMatch = responseText.match(/(\{[\s\S]*\})/)
        if (jsonMatch) {
          responseText = jsonMatch[1]
        }
        
        return JSON.parse(responseText)
      } catch (e) {
        console.error('Failed to parse Claude response:', e)
        console.error('Raw response length:', content.text?.length)
        console.error('Raw response preview:', content.text?.substring(0, 500))
        // Try a simpler analysis if the comprehensive one failed
        console.log('Attempting fallback simple analysis...')
        return await this.performSimpleAnalysis(code, issue, context)
      }
    }

    return null
  }

  private async performSimpleAnalysis(code: string, issue: string, context: any) {
    try {
      const simplePrompt = `Analyze this code issue and respond ONLY with valid JSON:

Issue: ${issue}
Code: ${code?.substring(0, 2000) || 'No specific code provided'}

Respond with this exact JSON structure:
{
  "rootCause": "Brief description of the issue",
  "complexity": 5,
  "confidence": 70,
  "isAutoFixable": true,
  "suggestedFix": {
    "description": "Simple description of what needs to be fixed",
    "codeChanges": []
  }
}`

      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: simplePrompt
          }
        ]
      })

      const content = response.content[0]
      if (content.type === 'text') {
        let responseText = content.text.trim()
        const jsonMatch = responseText.match(/(\{[\s\S]*\})/)
        if (jsonMatch) {
          responseText = jsonMatch[1]
        }
        return JSON.parse(responseText)
      }
    } catch (e) {
      console.error('Simple analysis also failed:', e)
    }
    
    return {
      rootCause: 'Analysis failed - Both comprehensive and simple analysis failed',
      complexity: 10,
      confidence: 0,
      isAutoFixable: false,
      error: 'Complete analysis failure - please check logs'
    }
  }

  async analyzeArchitecturalPatterns(
    files: Array<{ path: string; content: string }>,
    issuePattern: string
  ) {
    const systemPrompt = `You are an architectural analysis expert for React/TypeScript codebases.
    
    Analyze the provided files to identify:
    1. Common patterns and inconsistencies
    2. Opportunities for code reuse and DRY principles
    3. Missing abstractions that could prevent duplicate issues
    4. Architectural improvements for better maintainability
    
    Focus on finding where similar functionality is implemented differently across components.
    
    Respond in JSON format:
    {
      "patternAnalysis": {
        "commonPatterns": ["list of patterns found across multiple files"],
        "inconsistencies": ["where similar functionality differs"],
        "missingAbstractions": ["what could be extracted to utilities/hooks"]
      },
      "reuseOpportunities": [
        {
          "pattern": "pattern name",
          "files": ["affected files"],
          "suggestedAbstraction": "hook/utility name",
          "benefit": "why this would help"
        }
      ],
      "architecturalRecommendations": ["high-level suggestions for codebase improvement"]
    }`

    const userPrompt = `
    Issue Pattern: ${issuePattern}
    
    Files to analyze for architectural patterns:
    ${files.map(f => `
    File: ${f.path}
    \`\`\`
    ${f.content}
    \`\`\`
    `).join('\n')}
    
    Find patterns related to the issue and suggest architectural improvements.
    `

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      temperature: 0,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    })

    const content = response.content[0]
    if (content.type === 'text') {
      try {
        return JSON.parse(content.text)
      } catch (e) {
        console.error('Failed to parse architectural analysis:', e)
        return null
      }
    }

    return null
  }

  async generateFix(
    analysis: any,
    originalCode: string,
    context?: {
      fileName?: string
      language?: string
      projectContext?: string
      ticketTitle?: string
      ticketDescription?: string
      category?: string
      priority?: string
    }
  ) {
    const systemPrompt = `You are an expert software engineer. Generate production-ready code fixes based on the analysis provided.
    
    Requirements:
    1. Maintain existing code style and conventions
    2. Ensure backward compatibility
    3. Add necessary error handling
    4. Follow best practices for the language
    5. Generate complete, working code
    
    CRITICAL: Respond ONLY with valid JSON. Do not wrap in markdown code blocks. Do not include backticks or code fences.
    
    JSON format:
    {
      "fixedCode": "complete fixed code as a single string with proper escaping",
      "changes": [
        {
          "type": "add|modify|delete",
          "line": number,
          "description": "what changed"
        }
      ],
      "testCode": "unit test for the fix as a single string",
      "commitMessage": "conventional commit message",
      "prDescription": "detailed PR description"
    }`

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      temperature: 0,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `
          Analysis: ${JSON.stringify(analysis, null, 2)}
          
          Original Code:
          \`\`\`${context?.language || ''}
          ${originalCode}
          \`\`\`
          
          ${context?.projectContext || ''}
          `
        }
      ]
    })

    const content = response.content[0]
    if (content.type === 'text') {
      try {
        // Try to parse JSON directly first
        return JSON.parse(content.text)
      } catch (e) {
        console.error('Failed to parse fix generation:', e)
        console.log('Response content:', content.text.substring(0, 500))
        
        // Try to extract JSON from markdown if it's wrapped
        const jsonMatch = content.text.match(/```json\s*([\s\S]*?)\s*```/) || 
                         content.text.match(/```\s*([\s\S]*?)\s*```/) ||
                         content.text.match(/\{[\s\S]*\}/)
        
        if (jsonMatch) {
          try {
            return JSON.parse(jsonMatch[1] || jsonMatch[0])
          } catch (e2) {
            console.error('Failed to parse extracted JSON:', e2)
          }
        }
        
        // Fallback: try to clean up common JSON issues
        try {
          let cleanText = content.text
            .replace(/```[a-z]*\n?/g, '') // Remove code fences
            .replace(/```\n?/g, '')       // Remove closing fences
            .trim()
          
          // If still not valid JSON, return a safe fallback
          if (!cleanText.startsWith('{')) {
            return {
              fixedCode: originalCode, // Return original code if parsing fails
              changes: [],
              error: 'Failed to parse AI response'
            }
          }
          
          return JSON.parse(cleanText)
        } catch (e3) {
          console.error('All JSON parsing attempts failed:', e3)
          return {
            fixedCode: originalCode,
            changes: [],
            error: 'Failed to parse AI response'
          }
        }
      }
    }

    return null
  }

  async reviewPullRequest(
    prTitle: string,
    prDescription: string,
    files: Array<{ filename: string; changes: string; additions: number; deletions: number }>
  ) {
    const systemPrompt = `You are a senior code reviewer. Review this pull request and provide:
    1. Security concerns
    2. Performance issues
    3. Code quality feedback
    4. Suggestions for improvement
    
    Respond in JSON format:
    {
      "approved": boolean,
      "riskLevel": "low|medium|high",
      "securityIssues": [],
      "performanceIssues": [],
      "suggestions": [],
      "overallScore": 1-10
    }`

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `
          PR Title: ${prTitle}
          PR Description: ${prDescription}
          
          Files Changed:
          ${files.map(f => `
          File: ${f.filename}
          Additions: ${f.additions}
          Deletions: ${f.deletions}
          Changes:
          ${f.changes}
          `).join('\n---\n')}
          `
        }
      ]
    })

    const content = response.content[0]
    if (content.type === 'text') {
      try {
        return JSON.parse(content.text)
      } catch (e) {
        return { approved: false, riskLevel: 'high', error: 'Review failed' }
      }
    }

    return null
  }

  async analyzeMemoryConversation(prompt: string): Promise<{
    response: string
    suggestedActions: string[]
    extractedElements: any
    shouldSuggestPhotos?: boolean
    memoryType?: string
  }> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        temperature: 0.7, // More creative for natural conversation
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })

      const content = response.content[0]
      if (content.type === 'text') {
        const responseText = content.text

        // Analyze the response to extract suggested actions
        const suggestedActions = []
        const shouldSuggestPhotos = responseText.toLowerCase().includes('photo') || 
                                   responseText.toLowerCase().includes('picture') ||
                                   responseText.toLowerCase().includes('image')

        if (shouldSuggestPhotos) {
          suggestedActions.push('suggest_photo_upload')
        }

        // Detect memory type from response context
        let memoryType = 'general'
        if (responseText.toLowerCase().includes('food') || responseText.toLowerCase().includes('kitchen')) {
          memoryType = 'food'
        } else if (responseText.toLowerCase().includes('travel') || responseText.toLowerCase().includes('trip')) {
          memoryType = 'travel'
        } else if (responseText.toLowerCase().includes('family') || responseText.toLowerCase().includes('celebration')) {
          memoryType = 'celebration'
        } else if (responseText.toLowerCase().includes('work') || responseText.toLowerCase().includes('school')) {
          memoryType = 'milestone'
        }

        return {
          response: responseText,
          suggestedActions,
          extractedElements: {
            memoryType,
            shouldSuggestPhotos
          },
          shouldSuggestPhotos,
          memoryType
        }
      }
    } catch (error) {
      console.error('Memory conversation analysis error:', error)
    }

    return {
      response: "I'd love to hear more about this memory. What stands out most when you think back to that moment?",
      suggestedActions: [],
      extractedElements: {}
    }
  }
}