import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    console.log('🎧 WHISPER STREAMING: Starting streaming speech-to-text')

    if (!process.env.OPENAI_API_KEY || 
        process.env.OPENAI_API_KEY.includes('YOUR_COMPLETE_KEY_HERE') ||
        process.env.OPENAI_API_KEY.endsWith('sh3j')) {
      console.log('🎧 WHISPER STREAMING: OpenAI API key missing or incomplete')
      return NextResponse.json(
        { 
          success: false, 
          error: 'OpenAI API key not configured properly for streaming.',
          needsSetup: true 
        },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    
    if (!audioFile) {
      console.log('🎧 WHISPER STREAMING: No audio file provided')
      return NextResponse.json(
        { success: false, error: 'Audio file is required' },
        { status: 400 }
      )
    }

    console.log('🎧 WHISPER STREAMING: Processing audio chunk:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    })

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    // Use Whisper optimized for streaming
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
      response_format: 'json', // Use simple JSON for streaming
      temperature: 0.0 // Deterministic for consistency
      // NO prompt parameter to prevent hallucinations
    })

    console.log('🎧 WHISPER STREAMING: Transcription result:', {
      text: transcription.text?.substring(0, 100),
      fullText: transcription.text
    })

    const text = transcription.text?.trim() || ''
    
    // Skip very short transcriptions (likely noise or silence)
    if (text.length < 2) {
      console.log('🎧 WHISPER STREAMING: Text too short, likely noise')
      return NextResponse.json({
        success: false,
        transcription: '',
        reason: 'Audio too short or silent'
      })
    }

    // Light filtering for streaming - less aggressive than chunked version
    const streamingHallucinations = [
      'thank you', 'thanks', 'thank you.', 'thanks.',
      'you', 'you.', 'bye', 'bye.', 'okay', 'okay.',
      '...', 'silence', 'background'
    ]
    
    const isHallucination = streamingHallucinations.includes(text.toLowerCase())
    
    if (isHallucination) {
      console.log('🎧 WHISPER STREAMING: Filtered hallucination:', text)
      return NextResponse.json({
        success: false,
        transcription: text,
        reason: 'Common hallucination detected'
      })
    }

    return NextResponse.json({
      success: true,
      transcription: text,
      confidence: 0.95, // Simplified for streaming
      isPartial: text.length < 10 // Indicate if this might be partial
    })

  } catch (error) {
    console.error('🎧 WHISPER STREAMING: Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Whisper streaming transcription failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}