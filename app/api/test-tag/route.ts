import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { verifyToken } from '@/lib/auth'

// Test endpoint to create a photo tag directly
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 TEST TAG API: Starting test tag creation...')
    
    // Use your user ID directly for testing
    const user = { userId: '9a9c09ee-8d59-450b-bf43-58ee373621b8' }
    console.log('🧪 TEST TAG API: Using test user:', user.userId)

    // Use the media ID from your logs
    const mediaId = '1c3cb0e4-bd64-47b3-a9ac-4969410fb5f5'

    console.log('🧪 TEST TAG API: Testing with mediaId:', mediaId)

    // Step 1: Create a test person in user_networks
    console.log('🧪 TEST TAG API: Creating test person...')
    const { data: testPerson, error: personError } = await supabaseAdmin
      .from('user_networks')
      .insert({
        user_id: user.userId,
        person_name: 'Test Person API',
        person_email: 'test-api@example.com',
        relationship: 'Test Friend'
      })
      .select()
      .single()

    if (personError) {
      console.log('🧪 TEST TAG API: Person creation error:', personError)
      throw personError
    }

    console.log('🧪 TEST TAG API: Test person created:', testPerson)

    // Step 2: Check if media exists
    console.log('🧪 TEST TAG API: Checking if media exists...')
    const { data: mediaCheck, error: mediaError } = await supabaseAdmin
      .from('media')
      .select('id, memory_id')
      .eq('id', mediaId)
      .single()

    if (mediaError || !mediaCheck) {
      console.log('🧪 TEST TAG API: Media not found:', mediaError)
      return NextResponse.json({ 
        error: 'Media not found',
        mediaId,
        details: mediaError 
      }, { status: 404 })
    }

    console.log('🧪 TEST TAG API: Media found:', mediaCheck)

    // Step 3: Create photo tag
    console.log('🧪 TEST TAG API: Creating photo tag...')
    const { data: photoTag, error: tagError } = await supabaseAdmin
      .from('photo_tags')
      .insert({
        media_id: mediaId,
        tagged_person_id: testPerson.id,
        tagged_by_user_id: user.userId,
        x_position: 50,
        y_position: 50,
        tag_width: 10,
        tag_height: 10
      })
      .select(`
        id,
        media_id,
        tagged_person_id,
        tagged_by_user_id,
        x_position,
        y_position,
        tag_width,
        tag_height,
        created_at,
        user_networks!inner(
          id,
          person_name,
          person_email,
          relationship
        )
      `)
      .single()

    if (tagError) {
      console.log('🧪 TEST TAG API: Tag creation error:', tagError)
      throw tagError
    }

    console.log('🧪 TEST TAG API: Photo tag created successfully:', photoTag)

    return NextResponse.json({
      success: true,
      message: 'Test tag created successfully!',
      data: {
        person: testPerson,
        media: mediaCheck,
        tag: photoTag
      }
    })

  } catch (error) {
    console.error('🧪 TEST TAG API: Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create test tag',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
