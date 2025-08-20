import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const ttsStartTime = Date.now()
    console.log(`⏱️ [${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] 🔊 TTS API START`)
    console.log('🔊 TTS STREAMING: Starting text-to-speech streaming')

    const { text } = await request.json()
    
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Text is required' },
        { status: 400 }
      )
    }

    console.log('🔊 TTS STREAMING: Synthesizing text:', text.substring(0, 100))

    // 🔇 DISABLED SPEED MODE: Use ElevenLabs for all responses for consistent voice quality
    const useSpeedMode = false // Disabled to prevent voice switching

    if (useSpeedMode) {
      console.log('🚀 TTS STREAMING: Using OpenAI TTS-1 (speed mode for short sentences)...')
      
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      })

      try {
        const mp3 = await openai.audio.speech.create({
          model: 'tts-1', // Use regular TTS-1 for speed
          voice: 'nova',
          input: text,
          speed: 1.1 // Slightly faster
        })

        const audioBuffer = Buffer.from(await mp3.arrayBuffer())
        
        console.log(`⏱️ [${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] 🔊 TTS COMPLETE: OpenAI Speed Mode (${Date.now() - ttsStartTime}ms total)`)

        return new Response(audioBuffer, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length.toString(),
          },
        })
        
      } catch (openaiError) {
        console.log('🚀 TTS STREAMING: OpenAI speed mode failed, falling back to ElevenLabs:', openaiError)
      }
    }

    // Try ElevenLabs for longer sentences (better quality and more natural)
    if (process.env.ELEVEN_LABS_API_KEY) {
      try {
        console.log('🔊 TTS STREAMING: Using ElevenLabs (Rachel voice)...')
        
        const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': process.env.ELEVEN_LABS_API_KEY,
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75, // Higher for more natural sound
              style: 0.5,
              use_speaker_boost: true
            }
          }),
        })

        if (response.ok) {
          const audioBuffer = await response.arrayBuffer()
          console.log(`⏱️ [${new Date().toLocaleTimeString()}.${new Date().getMilliseconds().toString().padStart(3, '0')}] 🔊 TTS COMPLETE: ElevenLabs (${Date.now() - ttsStartTime}ms total)`)
          console.log('🔊 TTS STREAMING: ElevenLabs generated successfully, size:', audioBuffer.byteLength)

          return new Response(audioBuffer, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'Content-Length': audioBuffer.byteLength.toString(),
            },
          })
        } else {
          console.error('🔊 TTS STREAMING: ElevenLabs failed:', response.status, response.statusText)
        }
        
      } catch (elevenLabsError) {
        console.error('🔊 TTS STREAMING: ElevenLabs error:', elevenLabsError)
      }
    }

    // Fallback to OpenAI TTS if ElevenLabs unavailable
    if (process.env.OPENAI_API_KEY && 
        !process.env.OPENAI_API_KEY.includes('YOUR_COMPLETE_KEY_HERE') &&
        !process.env.OPENAI_API_KEY.endsWith('sh3j')) {
      
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      })

      try {
        console.log('🔊 TTS STREAMING: Using OpenAI TTS (fallback)...')
        
        const mp3 = await openai.audio.speech.create({
          model: 'tts-1-hd', // Use HD for better quality as fallback
          voice: 'nova', // Clear, friendly voice
          input: text,
          speed: 1.0
        })

        const audioBuffer = Buffer.from(await mp3.arrayBuffer())
        
        console.log('🔊 TTS STREAMING: OpenAI TTS generated successfully, size:', audioBuffer.length)

        return new Response(audioBuffer, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length.toString(),
          },
        })
        
      } catch (openaiError) {
        console.log('🔊 TTS STREAMING: OpenAI TTS failed:', openaiError)
      }
    }

    // If both services fail
    return NextResponse.json(
      { 
        success: false, 
        error: 'No TTS service available. Configure ElevenLabs or OpenAI API keys.' 
      },
      { status: 500 }
    )

  } catch (error) {
    console.error('🔊 TTS STREAMING: Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'TTS streaming failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}