import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { VoiceClient } from '@/lib/ai/voice-client'

export async function POST(request: NextRequest) {
  try {
    const token = extractTokenFromHeader(request.headers.get('authorization') || undefined)
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

    const { text, voiceId, emotion } = await request.json()

    if (!text) {
      return NextResponse.json(
        { success: false, error: 'Text is required' },
        { status: 400 }
      )
    }

    const voiceClient = new VoiceClient()
    
    // Generate speech with appropriate emotion/style settings
    const audioBuffer = await voiceClient.textToSpeech(text, {
      voiceId,
      stability: emotion === 'warm' ? 0.7 : 0.5,
      similarityBoost: 0.75,
      style: emotion === 'warm' ? 0.6 : 0.4
    })

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('Voice synthesis error:', error)
    return NextResponse.json(
      { success: false, error: 'Voice synthesis failed' },
      { status: 500 }
    )
  }
}