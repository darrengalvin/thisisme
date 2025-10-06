import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { memory_title, current_memory, user_message, conversation_history } = body
  
  try {

    // Step 1: Weave user's answer into the memory
    const weaveCompletion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a memory enrichment assistant. Your ONLY job is to ADD new details to an existing memory WITHOUT removing or changing ANY existing text.

CRITICAL RULES:
- PRESERVE EVERY SINGLE WORD of the existing memory exactly as written
- DO NOT paraphrase, rewrite, or summarize existing text
- ONLY ADD the new detail provided by the user
- Find the most natural insertion point for the new detail
- Use narrative transitions to blend it in: "I also remember...", "What stands out is...", "Looking back..."
- The final text should read as ONE cohesive narrative

Example:
Original: "I remember a big rubber mask at Croydon Hospital. I was about 12 years old, going in for ear tubes."
User adds: "It was in the 90s with those big plastic masks"
Result: "I remember a big rubber mask at Croydon Hospital. I was about 12 years old, going in for ear tubes. It was in the 90s when they used those big plastic masks, the kind that seemed oversized for a face."

Return ONLY the enhanced memory with ALL original details preserved + the new detail added.`
        },
        {
          role: 'user',
          content: `EXISTING MEMORY (PRESERVE EXACTLY):
"${current_memory}"

NEW DETAIL TO ADD:
"${user_message}"

Add the new detail WITHOUT removing or changing ANY existing text.`
        }
      ],
      temperature: 0.5,
      max_tokens: 1000
    })

    const enriched_memory = weaveCompletion.choices[0]?.message?.content || current_memory

    // Step 2: Detect and call VAPI tools based on context
    let location_info = null
    let web_context = null
    let similar_memories = null
    let chapter_suggestion = null
    let person_mentioned = null

    // Detect location mentions
    const locationMatch = user_message.match(/(hospital|school|park|street|building|city|town|place|at\s+[\w\s]+|in\s+[\w\s]+)/i)
    if (locationMatch) {
      try {
        const locationResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/maya/find-location-details`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: body.userId,
            location_query: locationMatch[0] 
          })
        })
        const locationData = await locationResponse.json()
        if (locationData.success) {
          location_info = locationData.data
        }
      } catch (err) {
        console.error('Location lookup error:', err)
      }
    }

    // Detect historical/temporal mentions (years, decades, events)
    const historicalMatch = user_message.match(/\b(19\d{2}|20\d{2}|sixties|seventies|eighties|nineties)\b/i)
    if (historicalMatch && memory_title) {
      try {
        const webResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/maya/search-web-context`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: body.userId,
            query: `${historicalMatch[0]} ${memory_title}` 
          })
        })
        const webData = await webResponse.json()
        if (webData.success) {
          web_context = webData.data.context
        }
      } catch (err) {
        console.error('Web context error:', err)
      }
    }

    // Detect person mentions
    const personMatch = user_message.match(/\b(mum|mom|dad|father|mother|sister|brother|friend|[\w]+(?:\s+[\w]+)?)\b/i)
    if (personMatch && personMatch[0].length > 2) {
      person_mentioned = personMatch[0]
    }

    // After a few exchanges, suggest a chapter
    if (conversation_history && conversation_history.length >= 4) {
      try {
        const chapterResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/maya/smart-chapter-suggestion`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userId: body.userId,
            memory_title,
            memory_description: enriched_memory 
          })
        })
        const chapterData = await chapterResponse.json()
        if (chapterData.success) {
          chapter_suggestion = chapterData.data.suggestion
        }
      } catch (err) {
        console.error('Chapter suggestion error:', err)
      }
    }

    // Step 3: Generate Maya's follow-up response with tool context
    const conversationContext = conversation_history
      .slice(-4) // Last 4 messages for context
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join('\n')

    // Detect topic repetition (if last 2 questions were about similar things)
    const recentQuestions = conversation_history
      .filter((msg: any) => msg.role === 'maya')
      .slice(-2)
      .map((msg: any) => msg.content.toLowerCase())
    
    const hasTopicRepetition = recentQuestions.length >= 2 && 
      recentQuestions.some((q1: string, i: number) => 
        recentQuestions.slice(i + 1).some((q2: string) => {
          const words1 = q1.split(/\s+/).filter((w: string) => w.length > 4)
          const words2 = q2.split(/\s+/).filter((w: string) => w.length > 4)
          const overlap = words1.filter((w: string) => words2.includes(w))
          return overlap.length >= 2 // Same topic if 2+ significant words overlap
        })
      )

    // Build context for Maya from tool results
    let toolContext = ''
    if (location_info) {
      toolContext += `\n\n🌍 LOCATION TOOL ACTIVATED: Found "${location_info.name || locationMatch[0]}". ASK: Did they live there? What connection did they have to this place?`
    }
    if (web_context) {
      toolContext += `\n\n🌐 WEB SEARCH TOOL: Historical context found. You can add depth about that era.`
    }
    if (chapter_suggestion) {
      toolContext += `\n\n📖 CHAPTER TOOL: Suggest organizing into "${chapter_suggestion.title}".`
    }
    if (person_mentioned) {
      toolContext += `\n\n👥 PERSON DETECTED: "${person_mentioned}" - Ask about their relationship or role.`
    }
    if (hasTopicRepetition) {
      toolContext += `\n\n⚠️ TOPIC REPETITION DETECTED: You've asked about similar things. CHANGE TOPIC NOW! Explore a different aspect.`
    }

    const responseCompletion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are Maya, a warm memory enrichment assistant with access to powerful tools. You're having a conversation to help someone add depth to their memory.

CRITICAL: VARY YOUR QUESTIONS! Don't drill down on the same detail repeatedly. Move between different aspects of the memory.

Your questioning strategy (cycle through these):
1. WHY - Why were they there? What was the reason?
2. WHERE - Location details? Did they live nearby? What was the area like?
3. WHO - Who was with them? What relationships?
4. WHEN - Time period context? What era? What was happening then?
5. WHAT - Specific sensory details (but don't over-focus on one item!)
6. HOW - How did events unfold? What happened next?
7. FEELINGS - Emotional state? How did it affect them?

AFTER 2 QUESTIONS ABOUT ONE ASPECT → MOVE TO A DIFFERENT ASPECT!

Example:
❌ BAD: Asked about mask → Asked about mask smell → Asked about mask texture (stuck on mask!)
✅ GOOD: Asked about mask smell → NOW ask about why they were at the hospital, or who was with them

Your style:
- Warm, conversational, empathetic
- Ask ONE specific question at a time
- Keep responses SHORT (2-3 sentences max)
- PRIORITIZE tool information (location, people, context) over repetitive sensory questions

YOUR TOOLS (USE THESE TO GUIDE CONVERSATION):
- Location details → ASK: Did they live there? What was their connection?
- Historical context → ASK: What was happening in their life then?
- Chapter suggestions → SUGGEST organizing memories
- Person detection → ASK: What was their relationship? Their role?

DON'T:
- Ask 3+ questions about the same object/detail
- Be formal or robotic
- Ignore tool information
- Miss obvious context clues (hospital → ask why they were there!)${toolContext}`
        },
        {
          role: 'user',
          content: `Memory: "${memory_title}"

Recent conversation:
${conversationContext}

User just said: "${user_message}"

Acknowledge their answer${location_info ? ', optionally mention the location info I found,' : ''}${chapter_suggestion ? ', optionally suggest the chapter,' : ''} and ask ONE thoughtful follow-up question to enrich the memory further.`
        }
      ],
      temperature: 0.8,
      max_tokens: 200
    })

    const maya_response = responseCompletion.choices[0]?.message?.content || 
      "That's a wonderful detail! What else do you remember about that moment?"

    // Step 4: Calculate enrichment progress
    const originalLength = current_memory.split(/\s+/).length
    const newLength = enriched_memory.split(/\s+/).length
    const growth = ((newLength / Math.max(originalLength, 50)) * 100)
    const progress = Math.min(Math.round(growth), 100)

    return NextResponse.json({
      success: true,
      maya_response,
      enriched_memory,
      progress,
      location_info,
      web_context,
      chapter_suggestion,
      person_mentioned,
      tools_used: {
        location: !!location_info,
        web_search: !!web_context,
        chapter: !!chapter_suggestion,
        person: !!person_mentioned
      }
    })

  } catch (error: any) {
    console.error('Enrich conversation error:', error)
    return NextResponse.json(
      { 
        success: false,
        maya_response: "I love hearing more about this! What else do you remember?",
        enriched_memory: current_memory,
        progress: 50
      },
      { status: 200 }
    )
  }
}
