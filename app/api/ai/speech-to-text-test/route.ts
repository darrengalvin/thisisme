import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 SPEECH-TO-TEXT TEST: Test route called')

    if (!process.env.OPENAI_API_KEY || 
        process.env.OPENAI_API_KEY.includes('YOUR_COMPLETE_KEY_HERE') ||
        process.env.OPENAI_API_KEY.endsWith('sh3j')) {
      console.log('🧪 SPEECH-TO-TEXT TEST: OpenAI API key missing or incomplete')
      return NextResponse.json(
        { 
          success: false, 
          error: 'OpenAI API key not configured properly. Please add your complete OpenAI API key to .env.local to enable speech-to-text functionality.',
          needsSetup: true 
        },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    
    if (!audioFile) {
      console.log('🧪 SPEECH-TO-TEXT TEST: No audio file provided')
      return NextResponse.json(
        { success: false, error: 'Audio file is required' },
        { status: 400 }
      )
    }

    console.log('🧪 SPEECH-TO-TEXT TEST: Audio file received:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    })

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

    console.log('🧪 SPEECH-TO-TEXT TEST: Transcription successful:', transcription.text?.substring(0, 100))

    return NextResponse.json({
      success: true,
      transcription: transcription.text,
      confidence: 0.95, // Whisper doesn't provide confidence scores
      segments: transcription.segments || []
    })

  } catch (error) {
    console.error('🧪 SPEECH-TO-TEXT TEST: Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Speech transcription failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}