import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// 🚀 EDGE RUNTIME: Eliminate cold starts for faster response
export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    console.log('🧠 GPT-4o STREAMING: Starting streaming conversation')

    if (!process.env.OPENAI_API_KEY || 
        process.env.OPENAI_API_KEY.includes('YOUR_COMPLETE_KEY_HERE') ||
        process.env.OPENAI_API_KEY.endsWith('sh3j')) {
      console.log('🧠 GPT-4o STREAMING: OpenAI API key missing or incomplete')
      return NextResponse.json(
        { 
          success: false, 
          error: 'OpenAI API key not configured properly for streaming.',
          needsSetup: true 
        },
        { status: 500 }
      )
    }

    const { message, conversationHistory } = await request.json()
    console.log('🧠 GPT-4o STREAMING: Received message:', message)
    console.log('🧠 GPT-4o STREAMING: Conversation history length:', conversationHistory?.length || 0)
    console.log('🧠 GPT-4o STREAMING: Message length:', message?.length || 0)

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    // Build conversation messages
    const messages = [
      {
        role: 'system' as const,
        content: `You are a helpful voice assistant having a real-time conversation. Keep responses conversational, natural, and concise (1-2 sentences). You're designed for streaming voice interaction, so be engaging and human-like.

Key guidelines:
- Respond naturally as if speaking to someone in person
- Keep responses brief but meaningful
- Ask follow-up questions to maintain conversation flow
- Be warm and personable
- Remember this is a voice conversation, not text chat`
      },
      // Add conversation history
      ...conversationHistory.slice(-10).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      // Add current message
      {
        role: 'user' as const,
        content: message
      }
    ]

    console.log('🧠 GPT-4o STREAMING: Calling OpenAI with streaming...')
    console.log('🧠 GPT-4o STREAMING: Final messages array:', JSON.stringify(messages, null, 2))
    
    const startTime = Date.now()

    // 🚀 PROMPT CACHING: Cache system message for faster TTFT
    const cachedMessages = messages.map((msg, index) => {
      if (index === 0 && msg.role === 'system') {
        return {
          ...msg,
          // Enable prompt caching for system message
          cache_control: { type: 'ephemeral' }
        }
      }
      return msg
    })

    // Create streaming completion
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Keep 4o-mini - good balance of speed/quality for 2025
      messages: cachedMessages,
      max_tokens: 150, // 🚀 REDUCE for voice - shorter responses = faster TTFT
      temperature: 0.7,
      stream: true,
      // 🚀 OPTIMIZE for voice conversation
      presence_penalty: 0.1, // Encourage variety
      frequency_penalty: 0.1, // Reduce repetition
      // 🚀 SPEED OPTIMIZATIONS
      top_p: 0.9, // Slightly reduce randomness for faster generation
      seed: 42, // Consistent seed for better caching
    })

    // Create streaming response
    const encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let firstTokenTime = null
          let tokenCount = 0
          
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || ''
            
            if (content) {
              tokenCount++
              if (!firstTokenTime) {
                firstTokenTime = Date.now()
                console.log(`🚀 FIRST TOKEN: ${firstTokenTime - startTime}ms (TTFT)`)
              }
              
              const data = JSON.stringify({ content })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }
          }
          
          console.log(`✅ STREAMING COMPLETE: ${tokenCount} tokens in ${Date.now() - startTime}ms`)
          
          // Send completion signal
          controller.enqueue(encoder.encode(`data: {"done": true}\n\n`))
          controller.close()
          
        } catch (error) {
          console.error('🧠 GPT-4o STREAMING: Stream error:', error)
          controller.error(error)
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('🧠 GPT-4o STREAMING: Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'GPT-4o streaming failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}