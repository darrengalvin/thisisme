import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { memory_title, memory_description } = body

    // Quick analysis to generate personalized greeting
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are Maya, a warm and empathetic AI memory assistant. You help people enrich their life memories through conversation.

Your job is to:
1. Greet the user warmly
2. Acknowledge what they've already written
3. Ask ONE specific, thoughtful question to get them started
4. Be conversational and friendly, not formal

Keep it concise (2-3 sentences max).`
        },
        {
          role: 'user',
          content: `Memory title: "${memory_title}"
Memory description: "${memory_description}"

Generate a warm greeting and ask your first enrichment question.`
        }
      ],
      temperature: 0.8,
      max_tokens: 150
    })

    const greeting = completion.choices[0]?.message?.content || 
      "Hi! I'm Maya 💜 I'd love to help you add more depth to this memory. What stands out most when you think back to this moment?"

    // Calculate initial progress
    const wordCount = memory_description.split(/\s+/).length
    const initial_progress = Math.min(Math.max(Math.round((wordCount / 100) * 100), 20), 100)

    return NextResponse.json({
      success: true,
      greeting,
      initial_progress
    })

  } catch (error: any) {
    console.error('Start chat error:', error)
    return NextResponse.json(
      { 
        success: false,
        greeting: "Hi! I'm Maya 💜 I'd love to help you enrich this memory. Tell me more about what you remember!",
        initial_progress: 20
      },
      { status: 200 } // Still return 200 with fallback
    )
  }
}
