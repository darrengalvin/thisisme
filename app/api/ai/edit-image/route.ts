import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

const STABILITY_API_KEY = process.env.STABILITY_API_KEY
const STABILITY_API_URL = 'https://api.stability.ai/v2beta/stable-image/edit/search-and-replace'

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

    // Check if user is premium
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
    const { imageBase64, editPrompt, originalPrompt } = body

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Image data is required' },
        { status: 400 }
      )
    }

    if (!editPrompt || typeof editPrompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Edit prompt is required' },
        { status: 400 }
      )
    }

    console.log('Editing image with Stability AI Search and Replace:', editPrompt.substring(0, 100) + '...')

    if (!STABILITY_API_KEY) {
      throw new Error('STABILITY_API_KEY is not configured')
    }

    // Convert base64 to Buffer
    const imageBuffer = Buffer.from(imageBase64, 'base64')

    // Edit image using Stability AI Search and Replace - Best for targeted edits
    const formData = new FormData()
    formData.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'image.png')
    formData.append('prompt', editPrompt)
    formData.append('mode', 'search')
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
      console.error('Stability AI edit error:', errorText)
      throw new Error(`Stability AI request failed: ${stabilityResponse.status} - ${errorText}`)
    }

    // Stability AI returns the image directly as binary
    console.log('Image edited successfully with Stability AI')
    const imageBlob = await stabilityResponse.blob()
    const arrayBuffer = await imageBlob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = buffer.toString('base64')
    const dataUrl = `data:image/png;base64,${base64Image}`

    return NextResponse.json({
      success: true,
      imageUrl: dataUrl
    })

  } catch (error: any) {
    console.error('Error editing AI image:', error)
    
    // Handle specific Stability AI errors
    if (error?.error?.code === 'content_policy_violation') {
      return NextResponse.json(
        { success: false, error: 'Your edit was flagged by our content policy. Please try a different description.' },
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
      { success: false, error: 'Failed to edit image. Please try again.' },
      { status: 500 }
    )
  }
}

