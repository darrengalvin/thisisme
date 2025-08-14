import { NextRequest, NextResponse } from 'next/server'
import { VoiceClient } from '@/lib/ai/voice-client'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 VOICE SYNTHESIS TEST: Test route called')

    const { text, voiceId, emotion } = await request.json()

    if (!text) {
      console.log('🧪 VOICE SYNTHESIS TEST: No text provided')
      return NextResponse.json(
        { success: false, error: 'Text is required' },
        { status: 400 }
      )
    }

    console.log('🧪 VOICE SYNTHESIS TEST: Synthesizing text:', text.substring(0, 100))

    const voiceClient = new VoiceClient()
    
    // Generate speech with appropriate emotion/style settings
    const audioBuffer = await voiceClient.textToSpeech(text, {
      voiceId,
      stability: emotion === 'warm' ? 0.7 : 0.5,
      similarityBoost: 0.75,
      style: emotion === 'warm' ? 0.6 : 0.4
    })

    console.log('🧪 VOICE SYNTHESIS TEST: Audio generated successfully, size:', audioBuffer.length)

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('🧪 VOICE SYNTHESIS TEST: Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Voice synthesis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}