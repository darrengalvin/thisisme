import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { memory_title, current_memory, user_message, conversation_history } = body

    // Step 1: Weave user's answer into the memory
    const weaveCompletion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You weave user responses into memory descriptions naturally.

RULES:
- Keep ALL existing text exactly as is
- Add the new detail at the most natural point
- Use narrative transitions: "I remember...", "Looking back...", "What stands out is..."
- Maintain the user's voice and tone
- Make it flow as if it was always part of the story

Return ONLY the enhanced memory description.`
        },
        {
          role: 'user',
          content: `Current memory: "${current_memory}"

User just shared: "${user_message}"

Weave this new detail into the memory naturally.`
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    })

    const enriched_memory = weaveCompletion.choices[0]?.message?.content || current_memory

    // Step 2: Check if user mentioned a location
    const locationMatch = user_message.match(/(hospital|school|park|street|building|city|town|place|location|at\s+\w+|in\s+\w+)/i)
    let location_info = null

    if (locationMatch) {
      // TODO: Call location API (find-location-details) if specific location mentioned
      // For now, we'll skip to keep it fast
    }

    // Step 3: Generate Maya's follow-up response
    const conversationContext = conversation_history
      .slice(-4) // Last 4 messages for context
      .map((msg: any) => `${msg.role}: ${msg.content}`)
      .join('\n')

    const responseCompletion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are Maya, a warm memory enrichment assistant. You're having a conversation to help someone add depth to their memory.

Your style:
- Warm, conversational, empathetic
- Ask ONE specific question at a time
- Focus on: emotions, sensory details, people, places, context
- Acknowledge their answer before asking the next question
- Use phrases like "That's beautiful!", "I love that detail", "Tell me more about..."
- Keep responses SHORT (2-3 sentences)

DON'T:
- Ask multiple questions at once
- Be formal or robotic
- Repeat questions

Current memory enrichment areas to explore:
- Emotions and feelings
- Sensory details (smells, sounds, textures, sights)
- People present and their actions
- Specific dialogue or words
- Environmental context
- Time-related details`
        },
        {
          role: 'user',
          content: `Memory: "${memory_title}"

Recent conversation:
${conversationContext}

User just said: "${user_message}"

Acknowledge their answer and ask ONE thoughtful follow-up question to enrich the memory further.`
        }
      ],
      temperature: 0.8,
      max_tokens: 150
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
      location_info
    })

  } catch (error: any) {
    console.error('Enrich conversation error:', error)
    return NextResponse.json(
      { 
        success: false,
        maya_response: "I love hearing more about this! What else do you remember?",
        enriched_memory: body.current_memory,
        progress: 50
      },
      { status: 200 }
    )
  }
}
