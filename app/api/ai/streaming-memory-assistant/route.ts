import { NextRequest, NextResponse } from 'next/server'
import { ClaudeClient } from '@/lib/ai/claude-client'
import { v4 as uuidv4 } from 'uuid'

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isPartial?: boolean
}

export async function POST(request: NextRequest) {
  try {
    console.log('🧠 STREAMING MEMORY AI: Starting streaming conversation')
    
    const { message, sessionId, conversationHistory, isPartial } = await request.json()
    console.log('🧠 STREAMING MEMORY AI: Received message:', { 
      text: message?.substring(0, 100),
      isPartial,
      sessionId: sessionId ? 'present' : 'missing'
    })

    // Initialize Claude client
    const claude = new ClaudeClient()
    console.log('🧠 STREAMING MEMORY AI: Claude client initialized')
    
    // Build enhanced streaming-aware prompt
    const streamingPrompt = buildStreamingMemoryAssistantPrompt(message, conversationHistory, isPartial)
    console.log('🧠 STREAMING MEMORY AI: Streaming prompt built')
    
    // Get streaming AI response
    const aiResponse = await claude.analyzeMemoryConversation(streamingPrompt)
    console.log('🧠 STREAMING MEMORY AI: AI response received:', aiResponse.response?.substring(0, 100))
    
    // Extract memory data
    const extraction = await extractMemoryData(message, conversationHistory, aiResponse)
    console.log('🧠 STREAMING MEMORY AI: Memory extraction completed')
    
    // Generate session ID if needed
    const responseSessionId = sessionId || `streaming-session-${Date.now()}`

    // Determine response priority for streaming
    const priority = determineResponsePriority(message, aiResponse.response)

    return NextResponse.json({
      success: true,
      sessionId: responseSessionId,
      response: aiResponse.response,
      extraction,
      memoryCreated: false, // Don't create in streaming mode yet
      suggestedActions: aiResponse.suggestedActions,
      followUpQuestions: extraction.followUpQuestions,
      shouldSuggestPhotos: (aiResponse as any).shouldSuggestPhotos || false,
      memoryType: (aiResponse as any).memoryType || 'general',
      priority, // high/medium/low for streaming optimization
      streamingReady: true
    })

  } catch (error) {
    console.error('🧠 STREAMING MEMORY AI: Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Streaming AI conversation failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

function buildStreamingMemoryAssistantPrompt(
  message: string, 
  conversationHistory?: ConversationMessage[],
  isPartial: boolean = false
): string {
  const history = conversationHistory?.map(msg => 
    `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
  ).join('\n') || ''

  const partialContext = isPartial ? 
    '\n\n⚡ STREAMING MODE: This user input may be partial/incomplete as they are still speaking. Provide a thoughtful response that acknowledges what they\'ve shared so far, but remain open to hearing more details.' : 
    '\n\n⚡ STREAMING MODE: User has finished speaking. Provide a complete, thoughtful response.'

  return `You are an intuitive memory organizer and companion who helps people capture their life stories with intelligent timeline awareness. You excel at REAL-TIME conversation and adapt to streaming/partial input naturally.

  USER CONTEXT (STREAMING MODE):
  - User Birth Year: 1985 (Age 39 in 2024)  
  - Existing Life Chapters: "Childhood (1985-2000)", "University Years (2003-2007)", "Early Career (2007-2015)", "BT Telecommunications (2015-2020)", "Freelance & Family (2020-Present)"
  - Major Life Events: Started at BT in 2015, Left BT in 2020, First child born in 2018, Moved to current home in 2019

  Conversation history:
  ${history}

  Current message: ${message}${partialContext}

  STREAMING CONVERSATION STYLE:
  - Respond naturally and immediately, as if in real-time conversation
  - If input seems partial, acknowledge what you heard and gently encourage more
  - Use natural conversational fillers: "I see...", "That's interesting...", "Tell me more about..."
  - Keep responses concise (1-2 sentences) for streaming flow
  - Show active listening: "So you're saying..." or "It sounds like..."

  TIMELINE-AWARE QUESTIONING (STREAMING):
  - For childhood memories: "So around [age] years old - that would be [year]. What stands out most?"
  - For work memories: "During your BT days or another job? What was that workplace like?"
  - For recent memories: "In your freelance period? How did that feel different from BT?"
  - Be conversational: "Ah, so this was when you were [age]..."

  RAPID CHAPTER ORGANIZATION:
  - Quickly place memories: "This sounds like your [chapter name] era"
  - Suggest connections: "Does this connect to other memories from that time?"
  - Be specific: "If you were 7, that's around 1992 - ring true?"

  CONTEXTUAL STREAMING RESPONSES:
  - CHILDHOOD: "What was your world like then? Who else was around?"
  - SCHOOL: "Primary or secondary school days? What was the atmosphere like?"
  - WORK: "During BT or another role? What was the office culture like?"
  - FAMILY: "With your child or before then? How did that moment feel?"

  ENGAGEMENT FOR STREAMING:
  - "That paints such a vivid picture..."
  - "I can almost see that moment..."
  - "What's the feeling that comes up when you think of that?"
  - "Was this a typical day or something special?"

  AVOID IN STREAMING:
  - Long responses that break conversation flow
  - Multiple questions at once
  - Overly formal language
  - Waiting for "complete" information

  STREAMING PRIORITY:
  - Acknowledge what they've shared immediately
  - Ask ONE follow-up question to deepen the memory
  - Help them feel heard and understood
  - Keep the conversation flowing naturally

  Respond as a caring friend having a real-time conversation, building their comprehensive life story together.`
}

function determineResponsePriority(userMessage: string, aiResponse: string): 'high' | 'medium' | 'low' {
  // High priority: Emotional content, significant life events, detailed memories
  if (userMessage.toLowerCase().includes('remember') || 
      userMessage.toLowerCase().includes('feel') ||
      userMessage.toLowerCase().includes('important') ||
      aiResponse.toLowerCase().includes('vivid') ||
      aiResponse.toLowerCase().includes('special')) {
    return 'high'
  }
  
  // Medium priority: Timeline questions, chapter organization
  if (aiResponse.includes('year') || 
      aiResponse.includes('age') || 
      aiResponse.includes('chapter') ||
      aiResponse.includes('BT') ||
      aiResponse.includes('childhood')) {
    return 'medium'
  }
  
  // Low priority: General responses, clarifications
  return 'low'
}

async function extractMemoryData(
  message: string,
  history: ConversationMessage[],
  aiResponse: any
) {
  // Simplified extraction for streaming mode
  const allUserContent = [
    ...history.filter(m => m.role === 'user').map(m => m.content),
    message
  ].join(' ')

  // Quick timeline detection
  const ageMatches = allUserContent.match(/\b(?:was|were|am)\s+(\d{1,2})\b/gi)
  const yearMatches = allUserContent.match(/\b(19\d{2}|20\d{2})\b/g)
  
  let suggestedYear = null
  if (ageMatches) {
    const age = parseInt(ageMatches[0].match(/\d+/)?.[0] || '0')
    suggestedYear = 1985 + age // User born 1985
  } else if (yearMatches) {
    suggestedYear = parseInt(yearMatches[0])
  }

  // Quick theme detection
  const themes = []
  if (allUserContent.match(/\b(family|parent|child|mother|father|son|daughter)\b/i)) themes.push('family')
  if (allUserContent.match(/\b(school|university|college|education|graduation)\b/i)) themes.push('education')
  if (allUserContent.match(/\b(work|job|career|BT|office|colleague)\b/i)) themes.push('work')
  if (allUserContent.match(/\b(travel|trip|vacation|journey|visit)\b/i)) themes.push('travel')

  return {
    title: message.split(/[.!?]/)[0].substring(0, 50),
    content: allUserContent,
    suggestedYear,
    themes,
    confidence: 0.7,
    followUpQuestions: []
  }
}