import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { memory_title, memory_description } = body

    if (!memory_title && !memory_description) {
      return NextResponse.json({
        success: true,
        hasEnoughInfo: false,
        completionPercent: 0,
        feedback: 'Start typing to get Maya\'s help!'
      })
    }

    const combinedText = `${memory_title || ''} ${memory_description || ''}`.trim()
    
    // Quick check with GPT-3.5 Turbo (fast and cheap)
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You analyze memory descriptions to determine if there's enough context to provide meaningful enrichment suggestions.

Respond with JSON containing:
- hasEnoughInfo (boolean): true if enough detail to ask thoughtful questions
- completionPercent (number 0-100): how complete the description feels
- feedback (string): brief encouragement or what's missing

Good descriptions mention: who, what, where, when, emotions, sensory details.
Need at least 2-3 of these elements.`
        },
        {
          role: 'user',
          content: `Memory: "${combinedText}"\n\nIs this enough to provide enrichment suggestions?`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 100
    })

    const analysis = JSON.parse(completion.choices[0]?.message?.content || '{}')

    return NextResponse.json({
      success: true,
      ...analysis
    })

  } catch (error: any) {
    console.error('Context check error:', error)
    return NextResponse.json(
      { success: false, error: error.message, hasEnoughInfo: false, completionPercent: 0 },
      { status: 500 }
    )
  }
}
