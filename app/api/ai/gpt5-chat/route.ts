import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// 🚀 EDGE RUNTIME: Eliminate cold starts for faster response
export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    console.log('🧠 GPT-5 CHAT: Starting GPT-5 chat conversation')

    if (!process.env.OPENAI_API_KEY || 
        process.env.OPENAI_API_KEY.includes('YOUR_COMPLETE_KEY_HERE') ||
        process.env.OPENAI_API_KEY.endsWith('sh3j')) {
      console.log('🧠 GPT-5 CHAT: OpenAI API key missing or incomplete')
      return NextResponse.json(
        { 
          success: false, 
          error: 'OpenAI API key not configured properly for GPT-5.',
          needsSetup: true 
        },
        { status: 500 }
      )
    }

    const { message, conversationHistory, systemPrompt, maxTokens = 1000 } = await request.json()
    console.log('🧠 GPT-5 CHAT: Received message:', message)
    console.log('🧠 GPT-5 CHAT: Conversation history length:', conversationHistory?.length || 0)

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    // Build conversation messages
    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt || `You are a helpful AI assistant powered by GPT-5. You provide thoughtful, accurate, and helpful responses while being conversational and engaging.`
      },
      // Add conversation history (keep last 10 messages for context)
      ...conversationHistory?.slice(-10).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })) || [],
      // Add current message
      {
        role: 'user' as const,
        content: message
      }
    ]

    console.log('🧠 GPT-5 CHAT: Calling OpenAI GPT-5 chat model...')
    
    const startTime = Date.now()

    // Use GPT-5 Chat Completions API
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-chat-latest', // Latest GPT-5 chat model
      messages: messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    })

    const responseTime = Date.now() - startTime
    console.log(`✅ GPT-5 CHAT COMPLETE: ${responseTime}ms`)

    const response = completion.choices[0]?.message?.content || 'No response generated'
    
    return NextResponse.json({
      success: true,
      response: response,
      model: 'gpt-5-chat-latest',
      usage: completion.usage,
      responseTime: responseTime
    })

  } catch (error: any) {
    console.error('🧠 GPT-5 CHAT: Error:', error)
    
    // Handle specific GPT-5 errors
    if (error.code === 'model_not_found') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'GPT-5 model not available. Please check your OpenAI account has access to GPT-5.',
          details: error.message
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'GPT-5 chat failed',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}