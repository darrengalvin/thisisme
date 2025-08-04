import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the audio file from form data
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Validate file size (25MB max for Whisper API)
    const maxSize = 25 * 1024 * 1024
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: 'Audio file too large. Maximum size is 25MB.' },
        { status: 400 }
      )
    }

    // Log for debugging
    console.log('Transcribing audio file:', {
      name: audioFile.name,
      type: audioFile.type,
      size: audioFile.size,
    })

    try {
      // Convert File to a format OpenAI accepts
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        response_format: 'text',
      })

      console.log('Transcription successful')

      return NextResponse.json({
        success: true,
        transcription: transcription,
      })
      
    } catch (openaiError: any) {
      console.error('OpenAI API error:', openaiError)
      
      // Handle specific OpenAI errors
      if (openaiError.status === 401) {
        return NextResponse.json(
          { error: 'Invalid OpenAI API key. Please check your configuration.' },
          { status: 500 }
        )
      }
      
      if (openaiError.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      }

      if (openaiError.status === 400) {
        return NextResponse.json(
          { error: 'Invalid audio file format. Please use a supported format (mp3, mp4, mpeg, mpga, m4a, wav, or webm).' },
          { status: 400 }
        )
      }
      
      // Generic error
      return NextResponse.json(
        { 
          error: 'Failed to transcribe audio. Please try again.',
          details: openaiError.message || 'Unknown error'
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Transcription endpoint error:', error)
    return NextResponse.json(
      { 
        error: 'An error occurred while processing your request',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    )
  }
}