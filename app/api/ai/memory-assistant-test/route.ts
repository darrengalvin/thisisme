import { NextRequest, NextResponse } from 'next/server'
import { ClaudeClient } from '@/lib/ai/claude-client'
import { v4 as uuidv4 } from 'uuid'

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  metadata?: {
    extractedData?: any
    suggestions?: string[]
  }
}

interface MemoryExtractionResult {
  title?: string
  content?: string
  suggestedDate?: Date
  suggestedLocation?: string
  detectedPeople?: string[]
  detectedEmotions?: string[]
  themes?: string[]
  timeZoneId?: string
  confidence: number
  followUpQuestions?: string[]
}

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 AI TEST ROUTE: Memory assistant test route called')
    
    const { message, sessionId, conversationHistory } = await request.json()
    console.log('🧪 AI TEST ROUTE: Received message:', message?.substring(0, 100))

    // Initialize Claude client
    const claude = new ClaudeClient()
    console.log('🧪 AI TEST ROUTE: Claude client initialized')
    
    // Prepare conversation context for AI
    const aiPrompt = buildMemoryAssistantPrompt(message, conversationHistory)
    console.log('🧪 AI TEST ROUTE: AI prompt built')
    
    // Get AI response
    const aiResponse = await claude.analyzeMemoryConversation(aiPrompt)
    console.log('🧪 AI TEST ROUTE: AI response received:', aiResponse.response?.substring(0, 100))
    
    // Extract memory data from conversation
    const extraction = await extractMemoryData(message, conversationHistory, aiResponse)
    console.log('🧪 AI TEST ROUTE: Memory extraction completed')
    
    // Create a mock session ID for testing
    const testSessionId = sessionId || `test-session-${Date.now()}`

    return NextResponse.json({
      success: true,
      sessionId: testSessionId,
      response: aiResponse.response,
      extraction,
      memoryCreated: false, // Don't actually create memories in test mode
      suggestedActions: aiResponse.suggestedActions,
      followUpQuestions: extraction.followUpQuestions,
      shouldSuggestPhotos: aiResponse.shouldSuggestPhotos,
      memoryType: aiResponse.memoryType
    })

  } catch (error) {
    console.error('🧪 AI TEST ROUTE: Memory assistant test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'AI test route error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

function buildMemoryAssistantPrompt(
  message: string, 
  conversationHistory?: ConversationMessage[]
): string {
  const history = conversationHistory?.map(msg => 
    `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
  ).join('\n') || ''

  return `You are an intuitive memory organizer and companion who helps people capture their life stories with intelligent timeline awareness. Your goal is to help them discover sensory details, emotions, and chronological context they might have forgotten.

  USER CONTEXT (TEST MODE - Simulated Data):
  - User Birth Year: 1985 (Age 39 in 2024)  
  - Existing Life Chapters: "Childhood (1985-2000)", "University Years (2003-2007)", "Early Career (2007-2015)", "BT Telecommunications (2015-2020)", "Freelance & Family (2020-Present)"
  - Major Life Events: Started at BT in 2015, Left BT in 2020, First child born in 2018, Moved to current home in 2019

  Conversation history:
  ${history}

  Current message: ${message}

  TIMELINE-AWARE QUESTIONING:
  - For childhood memories: "So you would have been around [age] years old - that places this around [year]. Does that sound right?"
  - For school memories: "Was this during your primary school years, or later in secondary school?"
  - For work memories: "Was this during your time at BT, or in one of your other roles?"
  - For recent memories: "Is this from your freelance period, or when you were still at BT?"
  - Always try to connect memories to known life phases and ask for clarification

  CHAPTER ORGANIZATION INTELLIGENCE:
  - When a clear timeframe emerges, suggest which chapter it belongs to
  - Ask: "This sounds like it fits with your [chapter name] - would you agree, or would you prefer a new chapter for this period?"
  - For memories that don't fit existing chapters: "This seems like it might be worth its own chapter. What would you call this period of your life?"
  - Be specific about timeline placement: "If you were 7, that would be around 1992 - does that match your memory?"

  CONTEXTUAL QUESTIONING APPROACH:
  - If they mention FOOD/KITCHEN: Ask about smells, tastes, sounds of cooking, who was there, what kitchen (childhood home, university, first apartment?)
  - If they mention PLACES: Ask about the atmosphere, lighting, sounds, PLUS when they lived there or visited
  - If they mention PEOPLE: Ask about their expressions, what they said, how they made them feel, PLUS how you knew them at that time
  - If they mention EVENTS: Ask about the moments before/after, unexpected things that happened, PLUS what was happening in their life then
  - If they mention WORK: Ask about colleagues, office environment, PLUS whether this was at BT or another role
  - If they mention AGES: Calculate the year and ask for confirmation of timeline placement

  CHRONOLOGICAL INTELLIGENCE EXAMPLES:
  - "You mentioned being in university - so this would be somewhere between 2003-2007?"
  - "Was this when you first started at BT, or later in your time there?"
  - "If your child was involved, this must be from 2018 onwards, right?"
  - "This sounds like it happened in your childhood home - would you have been living with your parents then?"

  DYNAMIC RESPONSE STYLE:
  - Use natural, conversational language that feels like a caring friend with an excellent memory
  - Ask about ONE specific sensory OR timeline detail at a time, not both
  - Show that you're building a picture of their life story
  - Reference previous memories when relevant

  ENGAGEMENT TECHNIQUES:
  - "That's fascinating! This adds another piece to your [chapter name] story..."
  - "I can almost picture that moment from [year]. What stood out most?"
  - "What's the one detail that's clearest when you think back to that time in your life?"
  - "How did that make you feel, especially considering what was happening in your life then?"

  AVOID:
  - Clinical or repetitive questions
  - Asking multiple questions at once
  - Generic responses that could apply to any memory
  - Making it feel like an interview
  - Getting the timeline wrong (double-check your age calculations!)

  PROACTIVE ORGANIZATION:
  - Always suggest which existing chapter a memory belongs to
  - Offer to create new chapters when memories don't fit existing ones
  - Help them see connections: "This reminds me of that other memory you shared from your BT days..."
  - Ask about related memories: "Does this make you think of any other moments from that period?"

  Respond as a curious, empathetic friend who's genuinely invested in helping them build a comprehensive, chronological life story.`
}

async function extractMemoryData(
  message: string,
  history: ConversationMessage[],
  aiResponse: any
): Promise<MemoryExtractionResult> {
  // Combine all user messages to extract memory data
  const allUserContent = [
    ...history.filter(m => m.role === 'user').map(m => m.content),
    message
  ].join(' ')

  // Extract dates
  const dateMatches = allUserContent.match(/\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}|\w+ \d{1,2},? \d{4}|yesterday|last \w+|today)\b/gi)
  const suggestedDate = dateMatches ? parseDate(dateMatches[0]) : undefined

  // Extract location
  const locationPattern = /(?:in|at|from|to|near|around)\s+([A-Z][a-zA-Z\s,]+)/g
  const locationMatch = allUserContent.match(locationPattern)
  const suggestedLocation = locationMatch ? locationMatch[0].replace(/^(in|at|from|to|near|around)\s+/, '') : undefined

  // Extract people (look for names and relationships)
  const peoplePattern = /(?:with|and|my|her|his|their)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g
  const peopleMatches = allUserContent.match(peoplePattern) || []
  const detectedPeople = peopleMatches.map(m => m.replace(/^(with|and|my|her|his|their)\s+/, ''))

  // Extract emotions
  const emotionWords = ['happy', 'sad', 'excited', 'nervous', 'proud', 'grateful', 'nostalgic', 'anxious', 'joyful', 'peaceful']
  const detectedEmotions = emotionWords.filter(emotion => 
    allUserContent.toLowerCase().includes(emotion)
  )

  // Extract themes
  const themes = []
  if (allUserContent.match(/\b(family|parent|child|sibling|mother|father|son|daughter)\b/i)) themes.push('family')
  if (allUserContent.match(/\b(friend|buddy|pal|companion)\b/i)) themes.push('friendship')
  if (allUserContent.match(/\b(work|job|career|office|colleague)\b/i)) themes.push('work')
  if (allUserContent.match(/\b(travel|trip|vacation|journey|visit)\b/i)) themes.push('travel')
  if (allUserContent.match(/\b(school|university|college|education|graduation)\b/i)) themes.push('education')
  if (allUserContent.match(/\b(birthday|anniversary|wedding|celebration|party)\b/i)) themes.push('celebration')

  // Calculate confidence based on extracted data
  let confidence = 0.3 // Base confidence
  if (suggestedDate) confidence += 0.2
  if (suggestedLocation) confidence += 0.15
  if (detectedPeople.length > 0) confidence += 0.15
  if (detectedEmotions.length > 0) confidence += 0.1
  if (themes.length > 0) confidence += 0.1

  // Generate follow-up questions based on missing data
  const followUpQuestions = []
  if (!suggestedDate) followUpQuestions.push("When did this happen? Can you remember the approximate date or time period?")
  if (!suggestedLocation) followUpQuestions.push("Where did this take place?")
  if (detectedPeople.length === 0) followUpQuestions.push("Who was with you during this memory?")
  if (detectedEmotions.length === 0) followUpQuestions.push("How did this experience make you feel?")

  // Extract title from first sentence or key phrase
  const firstSentence = allUserContent.split(/[.!?]/)[0]
  const title = firstSentence.length > 50 ? firstSentence.substring(0, 50) + '...' : firstSentence

  return {
    title: title.trim(),
    content: allUserContent,
    suggestedDate,
    suggestedLocation,
    detectedPeople,
    detectedEmotions,
    themes,
    confidence: Math.min(confidence, 1),
    followUpQuestions
  }
}

function parseDate(dateString: string): Date | undefined {
  // Handle relative dates
  const today = new Date()
  const lowerDate = dateString.toLowerCase()
  
  if (lowerDate === 'today') return today
  if (lowerDate === 'yesterday') {
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday
  }
  if (lowerDate.includes('last week')) {
    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)
    return lastWeek
  }
  if (lowerDate.includes('last month')) {
    const lastMonth = new Date(today)
    lastMonth.setMonth(lastMonth.getMonth() - 1)
    return lastMonth
  }
  if (lowerDate.includes('last year')) {
    const lastYear = new Date(today)
    lastYear.setFullYear(lastYear.getFullYear() - 1)
    return lastYear
  }

  // Try to parse absolute dates
  const parsed = new Date(dateString)
  return isNaN(parsed.getTime()) ? undefined : parsed
}