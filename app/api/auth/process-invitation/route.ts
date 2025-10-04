import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

/**
 * Process pending invitations when a user signs up
 * This checks for any pending invitations matching their email or phone
 * and automatically grants them access to the invited chapters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, email, phone } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!email && !phone) {
      return NextResponse.json(
        { success: false, error: 'Either email or phone is required' },
        { status: 400 }
      )
    }

    console.log(`🔍 Checking for pending invitations for user: ${userId}`, { email, phone })

    // Find all pending invitations matching this user's email or phone
    let query = supabaseAdmin
      .from('pending_invitations')
      .select('*')
      .eq('status', 'pending')

    // Build OR condition for email and/or phone
    const conditions = []
    if (email) conditions.push(`invitee_email.eq.${email}`)
    if (phone) conditions.push(`invitee_phone.eq.${phone}`)
    
    if (conditions.length > 0) {
      query = query.or(conditions.join(','))
    }

    const { data: invitations, error: invitationsError } = await query

    if (invitationsError) {
      console.error('❌ Error fetching pending invitations:', invitationsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch pending invitations' },
        { status: 500 }
      )
    }

    if (!invitations || invitations.length === 0) {
      console.log('✅ No pending invitations found for this user')
      return NextResponse.json({
        success: true,
        message: 'No pending invitations',
        processed: 0
      })
    }

    console.log(`📧 Found ${invitations.length} pending invitation(s)`)

    // Process each invitation
    const results = []
    let totalChaptersAdded = 0

    for (const invitation of invitations) {
      const chapterIds = invitation.invited_chapters || []
      
      console.log(`📚 Processing invitation ${invitation.id} with ${chapterIds.length} chapters`)

      // Add user to each invited chapter
      for (const chapterId of chapterIds) {
        try {
          // Check if membership already exists
          const { data: existingMember } = await supabaseAdmin
            .from('timezone_members')
            .select('id')
            .eq('timezone_id', chapterId)
            .eq('user_id', userId)
            .single()

          if (existingMember) {
            console.log(`ℹ️ User already member of chapter ${chapterId}`)
            continue
          }

          // Add user as a member of this chapter
          const { error: memberError } = await supabaseAdmin
            .from('timezone_members')
            .insert({
              timezone_id: chapterId,
              user_id: userId,
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
            totalChaptersAdded++
            results.push({
              chapterId,
              success: true
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
          accepted_by_user_id: userId
        })
        .eq('id', invitation.id)

      if (updateError) {
        console.error(`❌ Failed to mark invitation ${invitation.id} as accepted:`, updateError)
      }
    }

    console.log(`✅ Processed ${invitations.length} invitation(s), added to ${totalChaptersAdded} chapter(s)`)

    return NextResponse.json({
      success: true,
      message: `Processed ${invitations.length} invitation(s) and added to ${totalChaptersAdded} chapter(s)`,
      processed: invitations.length,
      chaptersAdded: totalChaptersAdded,
      results
    })

  } catch (error) {
    console.error('❌ Error processing invitations:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process invitations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

