import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { sendResendEmail } from '@/lib/resend'
import { sendSMS } from '@/lib/twilio'

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

    const body = await request.json()
    const { testEmail, testPhone, testType } = body

    const results = {
      resend: null as any,
      twilio: null as any,
      errors: [] as string[]
    }

    // Test Resend (Email)
    if (testType === 'email' || testType === 'both') {
      try {
        if (!testEmail) {
          throw new Error('Test email address required')
        }

        const emailResult = await sendResendEmail({
          to: testEmail,
          subject: 'Test Email from This Is Me',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #2563eb;">Test Email Successful! 🎉</h1>
              <p>This is a test email from your This Is Me application.</p>
              <p><strong>Resend Configuration:</strong></p>
              <ul>
                <li>Domain: yourcaio.co.uk</li>
                <li>From: noreply@yourcaio.co.uk</li>
                <li>Region: eu-west-1 (Ireland)</li>
              </ul>
              <p>If you received this email, your Resend integration is working correctly!</p>
            </div>
          `,
          text: 'Test Email Successful! This is a test email from your This Is Me application. If you received this email, your Resend integration is working correctly!'
        })

        results.resend = {
          success: true,
          messageId: emailResult?.id,
          message: 'Test email sent successfully'
        }
      } catch (error) {
        results.errors.push(`Resend error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        results.resend = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    // Test Twilio (SMS)
    if (testType === 'sms' || testType === 'both') {
      try {
        if (!testPhone) {
          throw new Error('Test phone number required')
        }

        const smsResult = await sendSMS({
          to: testPhone,
          body: 'Test SMS from This Is Me! 🎉 Your Twilio integration is working correctly. This is a test message from yourcaio.co.uk'
        })

        results.twilio = {
          success: true,
          messageSid: smsResult?.sid,
          message: 'Test SMS sent successfully'
        }
      } catch (error) {
        results.errors.push(`Twilio error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        results.twilio = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    }

    return NextResponse.json({
      success: results.errors.length === 0,
      results,
      message: 'Service test completed'
    })

  } catch (error) {
    console.error('Service test error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
