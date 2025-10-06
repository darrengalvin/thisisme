import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { verifyToken } from '@/lib/auth'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
})

export async function POST(request: NextRequest) {
  try {
    // Extract and verify token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Check if user is premium by checking Supabase database
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { data: userData } = await supabase
      .from('users')
      .select('is_premium')
      .eq('id', user.userId)
      .single()

    if (!userData?.is_premium) {
      return NextResponse.json(
        { success: false, error: 'This feature requires AI Pro subscription' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { prompt, memoryTitle, memoryDescription } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Image prompt is required' },
        { status: 400 }
      )
    }

    // Enhance the prompt with memory context
    let enhancedPrompt = prompt

    // Add context from memory if available
    if (memoryTitle || memoryDescription) {
      enhancedPrompt = `Create a realistic, nostalgic photograph of: ${prompt}`
      
      if (memoryTitle) {
        enhancedPrompt += `. This is for a memory titled "${memoryTitle}"`
      }
      
      enhancedPrompt += `. Style: photographic, warm tones, authentic, emotional, candid moment.`
    } else {
      enhancedPrompt = `Create a realistic, nostalgic photograph of: ${prompt}. Style: photographic, warm tones, authentic, emotional, candid moment.`
    }

    console.log('Generating image with prompt:', enhancedPrompt)

    // Generate image using DALL-E 3
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: enhancedPrompt,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
      response_format: 'url'
    })

    if (!response.data || response.data.length === 0) {
      throw new Error('No image data returned from OpenAI')
    }

    const imageUrl = response.data[0]?.url

    if (!imageUrl) {
      throw new Error('No image URL returned from OpenAI')
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      revisedPrompt: response.data[0]?.revised_prompt
    })

  } catch (error: any) {
    console.error('Error generating AI image:', error)
    
    // Handle specific OpenAI errors
    if (error?.error?.code === 'content_policy_violation') {
      return NextResponse.json(
        { success: false, error: 'Your prompt was flagged by our content policy. Please try a different description.' },
        { status: 400 }
      )
    }

    if (error?.status === 429) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again in a moment.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to generate image. Please try again.' },
      { status: 500 }
    )
  }
}
