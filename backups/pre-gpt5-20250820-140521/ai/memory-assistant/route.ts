import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
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
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization')
    console.log('🔐 MEMORY ASSISTANT AUTH HEADER:', authHeader ? 'Present' : 'Missing')
    
    const token = extractTokenFromHeader(authHeader || undefined)
    console.log('🎟️ MEMORY ASSISTANT TOKEN:', token ? 'Present' : 'Missing')
    
    if (!token) {
      console.log('❌ No token found in memory assistant request')
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await verifyToken(token)
    console.log('👤 MEMORY ASSISTANT USER:', user ? `Success: ${user.userId}` : 'Failed')
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { message, sessionId, conversationHistory } = await request.json()

    // Initialize Claude client
    const claude = new ClaudeClient()
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get or create conversation session
    let session
    if (sessionId) {
      const { data } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.userId)
        .single()
      
      session = data
    }

    if (!session) {
      // Create new session
      const newSessionId = uuidv4()
      const { data } = await supabase
        .from('ai_conversations')
        .insert({
          id: newSessionId,
          user_id: user.userId,
          session_type: 'memory_capture',
          messages: [],
          status: 'active'
        })
        .select()
        .single()
      
      session = data
    }

    // Prepare conversation context for AI
    const aiPrompt = buildMemoryAssistantPrompt(message, conversationHistory)
    
    // Get AI response
    const aiResponse = await claude.analyzeMemoryConversation(aiPrompt)
    
    // Extract memory data from conversation
    const extraction = await extractMemoryData(message, conversationHistory, aiResponse)
    
    // Update conversation session
    const updatedMessages = [
      ...(session.messages || []),
      { role: 'user', content: message, timestamp: new Date() },
      { 
        role: 'assistant', 
        content: aiResponse.response, 
        timestamp: new Date(),
        metadata: { extractedData: extraction }
      }
    ]

    await supabase
      .from('ai_conversations')
      .update({
        messages: updatedMessages,
        extracted_memories: extraction
      })
      .eq('id', session.id)

    // If we have enough information, suggest creating a memory
    let memoryCreated = false
    if (extraction.confidence > 0.7 && extraction.content) {
      // Check if user wants to create the memory
      if (message.toLowerCase().includes('yes') || 
          message.toLowerCase().includes('save') || 
          message.toLowerCase().includes('create')) {
        
        // Create the memory
        const { data: memory } = await supabase
          .from('memories')
          .insert({
            title: extraction.title || 'Untitled Memory',
            text_content: extraction.content,
            user_id: user.userId,
            timezone_id: extraction.timeZoneId || null,
            date_precision: extraction.suggestedDate ? 'exact' : 'approximate',
            approximate_date: extraction.suggestedDate?.toISOString() || null,
            created_at: extraction.suggestedDate || new Date()
          })
          .select()
          .single()

        // Store AI metadata
        if (memory) {
          await supabase
            .from('memory_ai_metadata')
            .insert({
              memory_id: memory.id,
              ai_generated: true,
              confidence_score: extraction.confidence,
              extraction_source: 'conversation',
              processing_notes: {
                sessionId: session.id,
                detectedPeople: extraction.detectedPeople,
                detectedEmotions: extraction.detectedEmotions,
                themes: extraction.themes,
                location: extraction.suggestedLocation
              }
            })

          memoryCreated = true
        }
      }
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      response: aiResponse.response,
      extraction,
      memoryCreated,
      suggestedActions: aiResponse.suggestedActions,
      followUpQuestions: extraction.followUpQuestions
    })

  } catch (error) {
    console.error('Memory assistant error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
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

  return `You are an intuitive memory companion who helps people relive and enrich their memories through natural conversation. Your goal is to help them discover sensory details, emotions, and moments they might have forgotten.

  Conversation history:
  ${history}

  Current message: ${message}

  CONTEXTUAL QUESTIONING APPROACH:
  - If they mention FOOD/KITCHEN: Ask about smells, tastes, sounds of cooking, who was there
  - If they mention PLACES: Ask about the atmosphere, lighting, sounds, what it felt like to be there
  - If they mention PEOPLE: Ask about their expressions, what they said, how they made them feel
  - If they mention EVENTS: Ask about the moments before/after, unexpected things that happened
  - If they mention SEASONS/WEATHER: Ask about how it felt on their skin, what they were wearing
  - If they mention OBJECTS: Ask about textures, colors, sounds they made
  - If they mention EMOTIONS: Ask what triggered those feelings, how their body felt

  DYNAMIC RESPONSE STYLE:
  - Vary your questioning approach based on the memory type
  - Use natural, conversational language that feels like a caring friend
  - Ask about ONE specific sensory detail at a time, not a list
  - If a memory seems visual (trips, events), suggest uploading photos
  - If a memory involves multiple people, ask about group dynamics
  - Pick up on subtle details they mention and dig deeper

  ENGAGEMENT TECHNIQUES:
  - "That's fascinating! Tell me more about..."
  - "I can almost picture that. What stood out most?"
  - "What's the one detail from that moment that's clearest to you?"
  - "How did that make you feel in the moment?"
  - "What would someone else have noticed if they were watching?"

  AVOID:
  - Clinical or repetitive questions
  - Asking multiple questions at once
  - Generic responses that could apply to any memory
  - Making it feel like an interview

  PROACTIVE SUGGESTIONS:
  - Suggest photo uploads for visual memories (trips, celebrations, milestones)
  - Ask about related memories: "Does this remind you of anything else?"
  - Offer to help organize: "This sounds like it belongs with your family memories"

  Respond as a curious, empathetic friend who genuinely wants to help them capture this moment in vivid detail.`
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

// Extension for Claude client to handle memory conversations
declare module '@/lib/ai/claude-client' {
  interface ClaudeClient {
    analyzeMemoryConversation(prompt: string): Promise<{
      response: string
      suggestedActions: string[]
      extractedElements: any
    }>
  }
}

// Add this method to ClaudeClient class in claude-client.ts
/*
async analyzeMemoryConversation(prompt: string) {
  const response = await this.client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    temperature: 0.7,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  })

  const content = response.content[0]
  if (content.type === 'text') {
    // Parse the response to extract structured data
    return {
      response: content.text,
      suggestedActions: [],
      extractedElements: {}
    }
  }

  return {
    response: "I'd love to hear more about this memory.",
    suggestedActions: [],
    extractedElements: {}
  }
}
*/