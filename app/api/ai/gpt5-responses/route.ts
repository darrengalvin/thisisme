import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// 🚀 EDGE RUNTIME: Eliminate cold starts for faster response
export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    console.log('🧠 GPT-5 RESPONSES: Starting GPT-5 reasoning conversation')

    if (!process.env.OPENAI_API_KEY || 
        process.env.OPENAI_API_KEY.includes('YOUR_COMPLETE_KEY_HERE') ||
        process.env.OPENAI_API_KEY.endsWith('sh3j')) {
      console.log('🧠 GPT-5 RESPONSES: OpenAI API key missing or incomplete')
      return NextResponse.json(
        { 
          success: false, 
          error: 'OpenAI API key not configured properly for GPT-5 Responses.',
          needsSetup: true 
        },
        { status: 500 }
      )
    }

    const { 
      message, 
      conversationHistory, 
      systemPrompt, 
      maxTokens = 2000,
      reasoningEffort = 'medium',
      verbosity = 'medium'
    } = await request.json()
    
    console.log('🧠 GPT-5 RESPONSES: Received message:', message)
    console.log('🧠 GPT-5 RESPONSES: Conversation history length:', conversationHistory?.length || 0)
    console.log('🧠 GPT-5 RESPONSES: Reasoning effort:', reasoningEffort)
    console.log('🧠 GPT-5 RESPONSES: Verbosity:', verbosity)

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    // Build conversation messages
    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt || `You are a helpful AI assistant powered by GPT-5's advanced reasoning capabilities. Think through problems step by step and provide thoughtful, well-reasoned responses.`
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

    console.log('🧠 GPT-5 RESPONSES: Calling OpenAI GPT-5 responses model...')
    
    const startTime = Date.now()

    // Use GPT-5 Responses API with reasoning controls
    const response = await openai.chat.completions.create({
      model: 'gpt-5-responses-latest', // Latest GPT-5 reasoning model
      messages: messages,
      max_tokens: maxTokens,
      temperature: 0.7,
      // GPT-5 Responses API specific parameters
      reasoning_effort: reasoningEffort, // 'low', 'medium', 'high'
      verbosity: verbosity, // 'low', 'medium', 'high'
    })

    const responseTime = Date.now() - startTime
    console.log(`✅ GPT-5 RESPONSES COMPLETE: ${responseTime}ms`)

    const completion = response.choices[0]?.message
    const responseContent = completion?.content || 'No response generated'
    
    // Extract reasoning trace if available (GPT-5 specific feature)
    const reasoningTrace = completion?.reasoning || null
    
    return NextResponse.json({
      success: true,
      response: responseContent,
      reasoning: reasoningTrace, // Include reasoning process for GPT-5
      model: 'gpt-5-responses-latest',
      usage: response.usage,
      responseTime: responseTime,
      reasoningEffort: reasoningEffort,
      verbosity: verbosity
    })

  } catch (error: any) {
    console.error('🧠 GPT-5 RESPONSES: Error:', error)
    
    // Handle specific GPT-5 errors
    if (error.code === 'model_not_found') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'GPT-5 Responses model not available. Please check your OpenAI account has access to GPT-5 Responses API.',
          details: error.message
        },
        { status: 400 }
      )
    }
    
    if (error.code === 'invalid_request_error' && error.message?.includes('reasoning_effort')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid reasoning effort parameter. Use "low", "medium", or "high".',
          details: error.message
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'GPT-5 responses failed',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}