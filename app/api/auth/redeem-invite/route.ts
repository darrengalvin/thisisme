import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'

/**
 * Manually redeem an invite code
 * This allows users to join chapters even if they signed up with 
 * a different email/phone than they were originally invited to
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
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
    const { inviteCode } = body

    if (!inviteCode || typeof inviteCode !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invite code is required' },
        { status: 400 }
      )
    }

    // Normalize invite code (uppercase, remove spaces/dashes)
    const normalizedCode = inviteCode.toUpperCase().replace(/[\s-]/g, '')

    console.log(`🎟️ Attempting to redeem invite code: ${normalizedCode} for user: ${user.userId}`)

    // Find the invitation
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('pending_invitations')
      .select('*')
      .eq('invite_code', normalizedCode)
      .single()

    if (invitationError || !invitation) {
      console.error('❌ Invite code not found:', normalizedCode)
      return NextResponse.json(
        { success: false, error: 'Invalid invite code. Please check and try again.' },
        { status: 404 }
      )
    }

    // Check if invitation has already been accepted
    if (invitation.status === 'accepted') {
      // Check if it was accepted by this same user
      if (invitation.accepted_by_user_id === user.userId) {
        return NextResponse.json(
          { success: false, error: 'You have already redeemed this invitation.' },
          { status: 400 }
        )
      } else {
        return NextResponse.json(
          { success: false, error: 'This invitation has already been used by someone else.' },
          { status: 400 }
        )
      }
    }

    // Check if invitation has expired
    if (invitation.status === 'expired' || (invitation.expires_at && new Date(invitation.expires_at) < new Date())) {
      return NextResponse.json(
        { success: false, error: 'This invitation has expired. Please contact the person who invited you.' },
        { status: 400 }
      )
    }

    // Check if invitation was cancelled
    if (invitation.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'This invitation has been cancelled.' },
        { status: 400 }
      )
    }

    const chapterIds = invitation.invited_chapters || []

    if (chapterIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'This invitation has no associated chapters.' },
        { status: 400 }
      )
    }

    console.log(`📚 Processing invitation with ${chapterIds.length} chapters`)

    // Get chapter details for response
    const { data: chapters } = await supabaseAdmin
      .from('timezones')
      .select('id, title')
      .in('id', chapterIds)

    // Add user to each invited chapter
    const results = []
    let chaptersAdded = 0

    for (const chapterId of chapterIds) {
      try {
        // Check if membership already exists
        const { data: existingMember } = await supabaseAdmin
          .from('timezone_members')
          .select('id')
          .eq('timezone_id', chapterId)
          .eq('user_id', user.userId)
          .single()

        if (existingMember) {
          console.log(`ℹ️ User already member of chapter ${chapterId}`)
          results.push({
            chapterId,
            success: true,
            alreadyMember: true
          })
          continue
        }

        // Add user as a member of this chapter
        const { error: memberError } = await supabaseAdmin
          .from('timezone_members')
          .insert({
            timezone_id: chapterId,
            user_id: user.userId,
            role: 'collaborator',
            joined_at: new Date().toISOString()
          })

        if (memberError) {
          console.error(`❌ Failed to add user to chapter ${chapterId}:`, memberError)
          results.push({
            chapterId,
            success: false,
            error: memberError.message
          })
        } else {
          console.log(`✅ Added user to chapter ${chapterId}`)
          chaptersAdded++
          results.push({
            chapterId,
            success: true,
            alreadyMember: false
          })
        }
      } catch (chapterError) {
        console.error(`❌ Error adding user to chapter ${chapterId}:`, chapterError)
        results.push({
          chapterId,
          success: false,
          error: chapterError instanceof Error ? chapterError.message : 'Unknown error'
        })
      }
    }

    // Mark invitation as accepted
    const { error: updateError } = await supabaseAdmin
      .from('pending_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by_user_id: user.userId
      })
      .eq('id', invitation.id)

    if (updateError) {
      console.error(`❌ Failed to mark invitation as accepted:`, updateError)
    }

    console.log(`✅ Invitation redeemed: ${chaptersAdded} new chapter(s) joined`)

    return NextResponse.json({
      success: true,
      message: chaptersAdded > 0 
        ? `Successfully joined ${chaptersAdded} chapter${chaptersAdded > 1 ? 's' : ''}!`
        : 'You were already a member of all invited chapters.',
      chaptersAdded,
      chapters: chapters || [],
      inviterName: invitation.invitee_name,
      results
    })

  } catch (error) {
    console.error('❌ Error redeeming invitation:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to redeem invitation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

