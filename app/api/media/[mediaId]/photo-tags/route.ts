import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { verifyToken } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { mediaId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { mediaId } = params

    // First, check if media exists at all
    const { data: mediaCheck, error: mediaCheckError } = await supabaseAdmin
      .from('media')
      .select('id, memory_id')
      .eq('id', mediaId)
      .single()

    if (mediaCheckError || !mediaCheck) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    // Now check if user has access to this media's memory
    const { data: memory, error: memoryError } = await supabaseAdmin
      .from('memories')
      .select(`
        id,
        user_id,
        timezone_id
      `)
      .eq('id', mediaCheck.memory_id)
      .single()

    if (memoryError || !memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
    }

    // Check if user owns the memory or is a member of the timezone
    let hasAccess = memory.user_id === user.userId

    if (!hasAccess && memory.timezone_id) {
      const { data: membership } = await supabaseAdmin
        .from('timezone_members')
        .select('id')
        .eq('timezone_id', memory.timezone_id)
        .eq('user_id', user.userId)
        .single()

      hasAccess = !!membership
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch photo tags for this media
    const { data: photoTags, error: tagsError } = await supabaseAdmin
      .from('photo_tags')
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
        ),
        users!photo_tags_tagged_by_user_id_fkey(
          id,
          email
        )
      `)
      .eq('media_id', mediaId)
      .order('created_at', { ascending: false })

    if (tagsError) throw tagsError

    // Transform the data to flatten the nested structure
    const transformedTags = (photoTags || []).map((tag: any) => ({
      id: tag.id,
      media_id: tag.media_id,
      tagged_person_id: tag.tagged_person_id,
      tagged_by_user_id: tag.tagged_by_user_id,
      x_position: tag.x_position,
      y_position: tag.y_position,
      tag_width: tag.tag_width,
      tag_height: tag.tag_height,
      created_at: tag.created_at,
      // Flatten the nested user_networks data
      tagged_person_name: tag.user_networks?.person_name || 'Unknown',
      tagged_person_email: tag.user_networks?.person_email,
      tagged_person_relationship: tag.user_networks?.relationship,
      // Flatten the nested users data
      tagged_by_email: tag.users?.email
    }))

    console.log('🏷️ PHOTO TAGS API: Returning transformed tags:', transformedTags)

    return NextResponse.json({
      success: true,
      tags: transformedTags
    })

  } catch (error) {
    console.error('Failed to fetch photo tags:', error)
    return NextResponse.json(
      { error: 'Failed to fetch photo tags' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { mediaId: string } }
) {
  try {
    console.log('🏷️ PHOTO TAGS API: POST request received')
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('🏷️ PHOTO TAGS API: No authorization header')
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const user = await verifyToken(token)
    if (!user) {
      console.log('🏷️ PHOTO TAGS API: Invalid token')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('🏷️ PHOTO TAGS API: User authenticated:', user.userId)

    const { mediaId } = params
    const body = await request.json()
    const { tags } = body

    console.log('🏷️ PHOTO TAGS API: MediaId:', mediaId)
    console.log('🏷️ PHOTO TAGS API: Tags received:', tags)

    if (!Array.isArray(tags)) {
      console.log('🏷️ PHOTO TAGS API: Tags is not an array')
      return NextResponse.json({ error: 'Tags must be an array' }, { status: 400 })
    }

    // First, check if media exists at all
    console.log('🏷️ PHOTO TAGS API: Checking if media exists...')
    const { data: mediaCheck, error: mediaCheckError } = await supabaseAdmin
      .from('media')
      .select('id, memory_id')
      .eq('id', mediaId)
      .single()

    if (mediaCheckError || !mediaCheck) {
      console.log('🏷️ PHOTO TAGS API: Media not found:', mediaCheckError)
      return NextResponse.json({ error: 'Media not found' }, { status: 404 })
    }

    console.log('🏷️ PHOTO TAGS API: Media exists:', mediaCheck)

    // Now check if user has access to this media's memory
    console.log('🏷️ PHOTO TAGS API: Checking memory access...')
    const { data: memory, error: memoryError } = await supabaseAdmin
      .from('memories')
      .select(`
        id,
        user_id,
        timezone_id
      `)
      .eq('id', mediaCheck.memory_id)
      .single()

    if (memoryError || !memory) {
      console.log('🏷️ PHOTO TAGS API: Memory not found:', memoryError)
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
    }

    console.log('🏷️ PHOTO TAGS API: Memory found:', memory)

    // Check if user owns the memory or is a member of the timezone
    let hasAccess = memory.user_id === user.userId

    if (!hasAccess && memory.timezone_id) {
      console.log('🏷️ PHOTO TAGS API: Checking timezone membership...')
      const { data: membership } = await supabaseAdmin
        .from('timezone_members')
        .select('id')
        .eq('timezone_id', memory.timezone_id)
        .eq('user_id', user.userId)
        .single()

      hasAccess = !!membership
      console.log('🏷️ PHOTO TAGS API: Timezone membership found:', !!membership)
    }

    console.log('🏷️ PHOTO TAGS API: User has access:', hasAccess)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete existing photo tags for this media by this user
    console.log('🏷️ PHOTO TAGS API: Deleting existing tags...')
    const { error: deleteError } = await supabaseAdmin
      .from('photo_tags')
      .delete()
      .eq('media_id', mediaId)
      .eq('tagged_by_user_id', user.userId)

    if (deleteError) {
      console.log('🏷️ PHOTO TAGS API: Delete error (might be expected if table doesn\'t exist):', deleteError)
      // Don't fail here - table might not exist yet
    }

    // Insert new photo tags
    const tagsToInsert = tags.map(tag => ({
      media_id: mediaId,
      tagged_person_id: tag.tagged_person_id,
      tagged_by_user_id: user.userId,
      x_position: tag.x_position,
      y_position: tag.y_position,
      tag_width: tag.tag_width || 10,
      tag_height: tag.tag_height || 10
    }))

    console.log('🏷️ PHOTO TAGS API: Tags to insert:', tagsToInsert)

    if (tagsToInsert.length > 0) {
      console.log('🏷️ PHOTO TAGS API: Inserting tags...')
      const { data: newTags, error: insertError } = await supabaseAdmin
        .from('photo_tags')
        .insert(tagsToInsert)
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

      if (insertError) {
        console.log('🏷️ PHOTO TAGS API: Insert error:', insertError)
        throw insertError
      }

      console.log('🏷️ PHOTO TAGS API: Tags inserted successfully:', newTags)

      return NextResponse.json({
        success: true,
        tags: newTags
      })
    }

    console.log('🏷️ PHOTO TAGS API: No tags to insert')
    return NextResponse.json({
      success: true,
      tags: []
    })

  } catch (error) {
    console.error('Failed to save photo tags:', error)
    return NextResponse.json(
      { error: 'Failed to save photo tags' },
      { status: 500 }
    )
  }
}
