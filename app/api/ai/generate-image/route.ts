import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

const STABILITY_API_KEY = process.env.STABILITY_API_KEY
const STABILITY_API_URL = 'https://api.stability.ai/v2beta/stable-image/generate/sd3'

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

    // Note: Prompt is already enhanced by /api/ai/enhance-image-prompt
    // This endpoint receives a detailed, vivid prompt ready for Stability AI
    console.log('Generating image with Stability AI SD 3.5 Large:', prompt.substring(0, 100) + '...')

    if (!STABILITY_API_KEY) {
      throw new Error('STABILITY_API_KEY is not configured')
    }

    // Generate image using Stability AI SD 3.5 Large - Best quality model
    const formData = new FormData()
    formData.append('prompt', prompt)
    formData.append('negative_prompt', 'ugly, blurry, low quality, distorted, deformed, unrealistic, cartoon, anime, illustration, painting, drawing, art, sketch, bad anatomy, bad hands, text, watermark, signature, logo, border, frame')
    formData.append('model', 'sd3.5-large') // Best quality Stability AI model
    formData.append('mode', 'text-to-image')
    formData.append('aspect_ratio', '1:1')
    formData.append('output_format', 'png')
    formData.append('seed', '0')

    const stabilityResponse = await fetch(STABILITY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STABILITY_API_KEY}`,
        'Accept': 'image/*'
      },
      body: formData
    })

    if (!stabilityResponse.ok) {
      const errorText = await stabilityResponse.text()
      console.error('Stability AI error:', errorText)
      throw new Error(`Stability AI request failed: ${stabilityResponse.status} - ${errorText}`)
    }

    // Stability AI returns the image directly as binary
    console.log('Image generated successfully with Stability AI SD 3.5 Large')
    const imageBlob = await stabilityResponse.blob()
    const arrayBuffer = await imageBlob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = buffer.toString('base64')
    const dataUrl = `data:image/png;base64,${base64Image}`

    return NextResponse.json({
      success: true,
      imageUrl: dataUrl,
      revisedPrompt: prompt
    })

  } catch (error: any) {
    console.error('Error generating AI image:', error)
    
    // Handle specific Stability AI errors
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
