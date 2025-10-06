import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { current_description, suggestion_question, user_answer } = body

    if (!current_description || !suggestion_question || !user_answer) {
      return NextResponse.json(
        { success: false, error: 'Missing description, question, or answer' },
        { status: 400 }
      )
    }

    // Use GPT-4 to naturally weave in the question AND answer
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a memory writing assistant. Your job is to take an existing memory description and naturally weave in additional details from the user's answer to a reflection question.

CRITICAL RULES:
- Keep ALL existing text exactly as is - DO NOT paraphrase or change it
- Find the most natural point in the narrative to add the new detail
- Weave in the answer seamlessly using narrative transitions
- Use phrases like: "I remember...", "Looking back...", "What I recall most is..."
- The added text should flow naturally as if it was always part of the story
- DON'T include the question itself - only weave in the answer
- Keep the user's voice and tone

Example:
Current: "I was under anesthetic at the hospital. I remember the big rubber mask."
Question: "How did you feel in the moments leading up to the operation?"
Answer: "I felt nervous but my mum held my hand"
Output: "I was under anesthetic at the hospital. In the moments leading up, I remember feeling nervous, but thankfully my mum was there holding my hand which helped ease my anxiety. I remember the big rubber mask."`
        },
        {
          role: 'user',
          content: `Current memory: "${current_description}"

Question that was asked: "${suggestion_question}"
User's answer: "${user_answer}"

Weave the user's answer naturally into the memory. Return ONLY the enhanced description.`
        }
      ],
      temperature: 0.7,
      max_tokens: 600
    })

    const weavedText = completion.choices[0]?.message?.content || current_description

    return NextResponse.json({
      success: true,
      weaved_description: weavedText
    })

  } catch (error: any) {
    console.error('Weave suggestion error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
