import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

export async function GET(request: NextRequest) {
  console.log('🔍 Sentry DSN configured:', !!process.env.NEXT_PUBLIC_SENTRY_DSN)
  console.log('🔍 Sentry DSN length:', process.env.NEXT_PUBLIC_SENTRY_DSN?.length)
  
  try {
    // Trigger a test error
    const error = new Error('🎉 SERVER-SIDE Sentry Test - If you see this in dashboard, it works!')
    
    console.log('🔍 About to capture exception...')
    
    // Capture the error in Sentry with await to ensure it completes
    const eventId = Sentry.captureException(error, {
      tags: { 
        api: 'test-sentry',
        test: true,
        source: 'server'
      },
      extra: {
        message: 'This is a deliberate test error to verify Sentry is working',
        timestamp: new Date().toISOString()
      }
    })
    
    console.log('✅ Exception captured with event ID:', eventId)
    
    // Flush to ensure it's sent before response
    await Sentry.flush(2000)
    console.log('✅ Sentry flushed')
    
    return NextResponse.json({
      success: true,
      eventId,
      message: '✅ Test error sent to Sentry! Check your dashboard at sentry.io',
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN?.substring(0, 30) + '...'
    })
  } catch (error) {
    console.error('❌ Error in test endpoint:', error)
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 })
  }
}
