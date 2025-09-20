import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { sendPersonInviteEmail } from '@/lib/resend'
import { sendPersonInviteSMS } from '@/lib/twilio'

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
    const { 
      personId, 
      personName, 
      personEmail, 
      personPhone, 
      relationship, 
      inviteMethod, 
      customMessage,
      selectedChapters = []
    } = body

    if (!personId || !personName || !relationship) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (inviteMethod === 'email' && !personEmail) {
      return NextResponse.json(
        { success: false, error: 'Email required for email invitation' },
        { status: 400 }
      )
    }

    if (inviteMethod === 'sms' && !personPhone) {
      return NextResponse.json(
        { success: false, error: 'Phone number required for SMS invitation' },
        { status: 400 }
      )
    }

    if (inviteMethod === 'both' && (!personEmail || !personPhone)) {
      return NextResponse.json(
        { success: false, error: 'Both email and phone number required for both invitation methods' },
        { status: 400 }
      )
    }

    let result = null
    let error = null

    try {
      if (inviteMethod === 'email') {
        result = await sendPersonInviteEmail(
          personName,
          personEmail,
          user.email || 'A friend', // You might want to get the user's display name
          relationship,
          customMessage || undefined,
          selectedChapters || undefined
        )
      } else if (inviteMethod === 'sms') {
        result = await sendPersonInviteSMS(
          personName,
          personPhone,
          user.email || 'A friend',
          relationship,
          customMessage,
          selectedChapters
        )
      } else if (inviteMethod === 'both') {
        // Send both email and SMS
        const emailResult = await sendPersonInviteEmail(
          personName,
          personEmail,
          user.email || 'A friend',
          relationship,
          customMessage || undefined,
          selectedChapters || undefined
        )
        const smsResult = await sendPersonInviteSMS(
          personName,
          personPhone,
          user.email || 'A friend',
          relationship,
          customMessage,
          selectedChapters
        )
        result = { email: emailResult, sms: smsResult }
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid invite method' },
          { status: 400 }
        )
      }

      console.log(`✅ Invitation sent via ${inviteMethod}:`, { personName, result })

      // Store selected chapters in the person's network record for future processing
      if (selectedChapters && selectedChapters.length > 0) {
        console.log(`📚 Storing ${selectedChapters.length} chapter invitations for person:`, selectedChapters)
        
        try {
          const { supabaseAdmin } = await import('@/lib/supabase-server')
          
          // Update the person's network record with pending chapter invitations
          const { error: updateError } = await supabaseAdmin
            .from('user_networks')
            .update({
              pending_chapter_invitations: selectedChapters,
              updated_at: new Date().toISOString()
            })
            .eq('id', personId)
          
          if (updateError) {
            console.error(`❌ Failed to store chapter invitations:`, updateError)
          } else {
            console.log(`✅ Stored chapter invitations for person`)
          }
        } catch (chapterError) {
          console.error('❌ Error storing chapter invitations:', chapterError)
        }
      }

      return NextResponse.json({
        success: true,
        message: `Invitation sent successfully via ${inviteMethod}${selectedChapters.length > 0 ? ` and added to ${selectedChapters.length} chapter${selectedChapters.length > 1 ? 's' : ''}` : ''}`,
        data: result
      })

    } catch (inviteError) {
      console.error(`❌ Failed to send ${inviteMethod} invitation:`, inviteError)
      error = inviteError
    }

    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to send ${inviteMethod} invitation`,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )

  } catch (error) {
    console.error('Invite API error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
