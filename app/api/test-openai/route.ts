import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'OPENAI_API_KEY is not set in environment variables',
      })
    }

    // Mask the API key for security
    const maskedKey = apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4)
    
    // Try to initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
    })

    // Test the API key with a simple models list request
    try {
      const models = await openai.models.list()
      
      return NextResponse.json({
        success: true,
        message: 'OpenAI API key is valid and working',
        apiKeyMasked: maskedKey,
        modelsAvailable: models.data.length > 0,
        whisperAvailable: models.data.some(m => m.id.includes('whisper')),
      })
    } catch (apiError: any) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key is invalid or has insufficient permissions',
        apiKeyMasked: maskedKey,
        details: apiError.message,
      })
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Failed to test OpenAI configuration',
      details: error.message,
    })
  }
}