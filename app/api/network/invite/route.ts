import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { sendPersonInviteEmail } from '@/lib/resend'
import { sendPersonInviteSMS } from '@/lib/twilio'
import { supabaseAdmin } from '@/lib/supabase-server'

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

    // STEP 1: Create pending invitation record BEFORE sending emails/SMS
    // This ensures we track the invitation regardless of how they sign up
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('pending_invitations')
      .insert({
        inviter_user_id: user.userId,
        invitee_email: personEmail || null,
        invitee_phone: personPhone || null,
        invitee_name: personName,
        invited_chapters: selectedChapters.length > 0 ? selectedChapters : [],
        relationship: relationship,
        custom_message: customMessage || null,
        invite_method: inviteMethod,
        status: 'pending'
      })
      .select()
      .single()

    if (invitationError) {
      console.error('❌ Failed to create invitation record:', invitationError)
      return NextResponse.json(
        { success: false, error: 'Failed to create invitation record' },
        { status: 500 }
      )
    }

    console.log(`✅ Created invitation record:`, invitation.id)

    // STEP 2: Send the actual invitation via email/SMS
    let result = null
    let error = null

    try {
      if (inviteMethod === 'email') {
        result = await sendPersonInviteEmail(
          personName,
          personEmail,
          user.email || 'A friend',
          relationship,
          customMessage || undefined,
          selectedChapters || undefined,
          invitation.invite_code
        )
      } else if (inviteMethod === 'sms') {
        result = await sendPersonInviteSMS(
          personName,
          personPhone,
          user.email || 'A friend',
          relationship,
          customMessage,
          selectedChapters,
          invitation.invite_code
        )
      } else if (inviteMethod === 'both') {
        // Send both email and SMS
        const emailResult = await sendPersonInviteEmail(
          personName,
          personEmail,
          user.email || 'A friend',
          relationship,
          customMessage || undefined,
          selectedChapters || undefined,
          invitation.invite_code
        )
        const smsResult = await sendPersonInviteSMS(
          personName,
          personPhone,
          user.email || 'A friend',
          relationship,
          customMessage,
          selectedChapters,
          invitation.invite_code
        )
        result = { email: emailResult, sms: smsResult }
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid invite method' },
          { status: 400 }
        )
      }

      console.log(`✅ Invitation sent via ${inviteMethod}:`, { personName, result })

      // STEP 3: Also store in the person's network record for backwards compatibility
      if (selectedChapters && selectedChapters.length > 0) {
        console.log(`📚 Storing ${selectedChapters.length} chapter invitations for person:`, selectedChapters)
        
        try {
          const { error: updateError } = await supabaseAdmin
            .from('user_networks')
            .update({
              pending_chapter_invitations: selectedChapters,
              updated_at: new Date().toISOString()
            })
            .eq('id', personId)
          
          if (updateError) {
            console.error(`❌ Failed to store chapter invitations in user_networks:`, updateError)
          } else {
            console.log(`✅ Stored chapter invitations in user_networks`)
          }
        } catch (chapterError) {
          console.error('❌ Error storing chapter invitations:', chapterError)
        }
      }

      return NextResponse.json({
        success: true,
        message: `Invitation sent successfully via ${inviteMethod}${selectedChapters.length > 0 ? ` with access to ${selectedChapters.length} chapter${selectedChapters.length > 1 ? 's' : ''}` : ''}`,
        data: result,
        invitationId: invitation.id,
        inviteCode: invitation.invite_code // Return the code so UI can show it
      })

    } catch (inviteError) {
      console.error(`❌ Failed to send ${inviteMethod} invitation:`, inviteError)
      error = inviteError
      
      // Check if it's a Twilio credentials issue
      if (inviteMethod === 'sms' && error instanceof Error && error.message.includes('credentials')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'SMS service not configured. Please contact support.',
            details: 'Twilio credentials are missing or invalid'
          },
          { status: 503 }
        )
      }
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
