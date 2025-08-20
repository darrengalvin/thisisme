import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    console.log('🎧 STREAMING STT: Starting streaming speech-to-text')

    if (!process.env.OPENAI_API_KEY || 
        process.env.OPENAI_API_KEY.includes('YOUR_COMPLETE_KEY_HERE') ||
        process.env.OPENAI_API_KEY.endsWith('sh3j')) {
      console.log('🎧 STREAMING STT: OpenAI API key missing or incomplete')
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
      console.log('🎧 STREAMING STT: No audio file provided')
      return NextResponse.json(
        { success: false, error: 'Audio file is required' },
        { status: 400 }
      )
    }

    console.log('🎧 STREAMING STT: Processing audio chunk:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    })

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })

    // Use Whisper with optimized settings for real-time
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en',
      response_format: 'verbose_json',
      temperature: 0.0 // More deterministic for real-time
      // Removed prompt to prevent hallucinations
    })

    console.log('🎧 STREAMING STT: Transcription result:', {
      text: transcription.text?.substring(0, 100),
      fullText: transcription.text, // Show full text for debugging
      duration: transcription.duration,
      segments: transcription.segments?.length,
      language: transcription.language,
      segments_detail: transcription.segments?.map(s => ({
        text: s.text,
        start: s.start,
        end: s.end
      }))
    })

    // Enhanced filtering for streaming context
    const text = transcription.text?.trim() || ''
    
    // Skip very short transcriptions (likely noise)
    if (text.length < 3) {
      console.log('🎧 STREAMING STT: Text too short, likely noise')
      return NextResponse.json({
        success: false,
        transcription: '',
        confidence: 0,
        isNoise: true,
        reason: 'Text too short'
      })
    }

    // Filter common hallucinations and AI feedback with confidence scoring
    const commonHallucinations = [
      // Thank you variations (most common hallucination)
      'thank you', 'thanks', 'thank you.', 'thanks.', 'thank you!', 'thanks!',
      'thankyou', 'thankyou.', 'thankyou!', 'thank', 'thank.',
      
      // Basic responses  
      'you', 'you.', 'bye', 'bye.', 'okay', 'okay.', 'ok', 'ok.',
      'yeah', 'yeah.', 'yes', 'yes.', 'no', 'no.',
      
      // Filler sounds
      'mm-hmm', 'uh-huh', 'hmm', 'um', 'uh', 'ah', 'oh', 'oh.',
      'mhmm', 'mmhmm', 'uh', 'uhh', 'mm', 'mmm',
      
      // System/background
      '...', 'silence', 'background', 'music', 'noise',
      
      // AI feedback loops
      'i hear you', 'sounds like', 'what memory', 'explore',
      'companion', 'real-time', 'streaming', 'memory', 'assistant',
      'welcome', 'hello', 'hi', 'ready'
    ]
    
    const isHallucination = commonHallucinations.includes(text.toLowerCase())
    
    // Always filter hallucinations regardless of confidence
    if (isHallucination) {
      console.log('🎧 STREAMING STT: Filtered hallucination:', text)
      return NextResponse.json({
        success: false,
        transcription: text,
        confidence: 0.1,
        isHallucination: true,
        reason: 'Common hallucination detected'
      })
    }
    
    // Calculate confidence based on audio duration and text length
    const confidence = transcription.duration && transcription.duration > 0.5 && text.length > 5 ? 0.95 : 0.3

    return NextResponse.json({
      success: true,
      transcription: text,
      confidence,
      duration: transcription.duration,
      segments: transcription.segments || [],
      isComplete: text.endsWith('.') || text.endsWith('!') || text.endsWith('?')
    })

  } catch (error) {
    console.error('🎧 STREAMING STT: Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Streaming speech transcription failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}