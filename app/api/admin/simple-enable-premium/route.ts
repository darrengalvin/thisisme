import { NextRequest, NextResponse } from 'next/server'

// Simplified endpoint that just returns success
// The actual premium check is handled by the hardcoded email check in components
export async function POST(request: NextRequest) {
  try {
    // Since we have hardcoded the email check in AddMemoryWizard.tsx
    // and the premium-status endpoint, we just need to return success here
    
    return NextResponse.json({
      success: true,
      message: 'Premium features are now enabled for dgalvin@yourcaio.co.uk',
      note: 'The system is configured to automatically recognize your email as premium.',
      userId: 'hardcoded-premium',
      email: 'dgalvin@yourcaio.co.uk',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      features: {
        voiceTranscription: true,
        unlimitedMemories: true,
        advancedSearch: true,
        prioritySupport: true
      }
    })

  } catch (error) {
    console.error('Error in simple-enable-premium:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
}