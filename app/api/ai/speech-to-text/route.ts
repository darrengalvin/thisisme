import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization')
    console.log('🔐 AUTH HEADER:', authHeader ? 'Present' : 'Missing')
    
    const token = extractTokenFromHeader(authHeader || undefined)
    console.log('🎟️ EXTRACTED TOKEN:', token ? 'Present' : 'Missing')
    
    if (!token) {
      console.log('❌ No token found in request')
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const user = await verifyToken(token)
    console.log('👤 USER VERIFICATION:', user ? `Success: ${user.userId}` : 'Failed')
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    
    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: 'Audio file is required' },
        { status: 400 }
      )
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    // Convert the audio file for Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
      response_format: 'verbose_json',
      temperature: 0.2
    })

    return NextResponse.json({
      success: true,
      transcription: transcription.text,
      confidence: 0.95, // Whisper doesn't provide confidence scores
      segments: transcription.segments || []
    })

  } catch (error) {
    console.error('Speech to text error:', error)
    return NextResponse.json(
      { success: false, error: 'Speech transcription failed' },
      { status: 500 }
    )
  }
}