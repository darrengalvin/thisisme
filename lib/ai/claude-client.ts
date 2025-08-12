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
    }
  ) {
    const systemPrompt = `You are an expert software engineer specialized in debugging and fixing code issues. 
    Analyze the provided code and issue description, then provide a detailed analysis including:
    1. Root cause identification
    2. Specific code changes needed
    3. Potential side effects
    4. Testing recommendations
    
    Respond in JSON format with the following structure:
    {
      "rootCause": "description of the root cause",
      "complexity": 1-10,
      "confidence": 0-100,
      "isAutoFixable": boolean,
      "suggestedFix": {
        "description": "what needs to be changed",
        "codeChanges": [
          {
            "file": "filename",
            "lineStart": number,
            "lineEnd": number,
            "oldCode": "original code",
            "newCode": "fixed code",
            "explanation": "why this change"
          }
        ]
      },
      "risks": ["potential risk 1", "potential risk 2"],
      "testingRequired": ["test case 1", "test case 2"]
    }`

    const userPrompt = `
    Issue Description: ${issue}
    
    ${context?.fileName ? `File: ${context.fileName}` : ''}
    ${context?.language ? `Language: ${context.language}` : ''}
    
    Code to analyze:
    \`\`\`${context?.language || ''}
    ${code}
    \`\`\`
    
    ${context?.relatedFiles ? `
    Related Files:
    ${context.relatedFiles.map(f => `
    File: ${f.path}
    \`\`\`
    ${f.content}
    \`\`\`
    `).join('\n')}
    ` : ''}
    `

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
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
        console.error('Failed to parse Claude response:', e)
        return {
          rootCause: 'Analysis failed',
          complexity: 10,
          confidence: 0,
          isAutoFixable: false,
          error: 'Failed to parse AI response'
        }
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
    }
  ) {
    const systemPrompt = `You are an expert software engineer. Generate production-ready code fixes based on the analysis provided.
    
    Requirements:
    1. Maintain existing code style and conventions
    2. Ensure backward compatibility
    3. Add necessary error handling
    4. Follow best practices for the language
    5. Generate complete, working code
    
    Respond in JSON format:
    {
      "fixedCode": "complete fixed code",
      "changes": [
        {
          "type": "add|modify|delete",
          "line": number,
          "description": "what changed"
        }
      ],
      "testCode": "unit test for the fix",
      "commitMessage": "conventional commit message",
      "prDescription": "detailed PR description"
    }`

    const response = await this.client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
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
        return JSON.parse(content.text)
      } catch (e) {
        console.error('Failed to parse fix generation:', e)
        return null
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
      model: 'claude-3-5-sonnet-20241022',
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
}