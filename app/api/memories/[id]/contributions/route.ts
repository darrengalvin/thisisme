import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memoryId = params.id
    console.log('💬 CONTRIBUTIONS API: Loading contributions for memory:', memoryId)
    
    // Get authentication token
    const token = extractTokenFromHeader(request.headers.get('authorization') || undefined)
    
    if (!token) {
      console.log('💬 CONTRIBUTIONS API: No auth token provided')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify user
    const user = await verifyToken(token)
    if (!user) {
      console.log('💬 CONTRIBUTIONS API: Invalid token')
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    console.log('💬 CONTRIBUTIONS API: User authenticated:', user.userId)

    // Check if user has access to this memory (owner or collaborator)
    const { data: memory, error: memoryError } = await supabaseAdmin
      .from('memories')
      .select('id, user_id')
      .eq('id', memoryId)
      .single()

    if (memoryError || !memory) {
      console.log('💬 CONTRIBUTIONS API: Memory not found')
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      )
    }

    // Check if user owns the memory
    const isOwner = memory.user_id === user.userId

    // Check if user is a collaborator
    const { data: collaboration, error: collaborationError } = await supabaseAdmin
      .from('memory_collaborations')
      .select('permissions, status')
      .eq('memory_id', memoryId)
      .eq('collaborator_id', user.userId)
      .eq('status', 'accepted')
      .single()

    const isCollaborator = !collaborationError && collaboration

    if (!isOwner && !isCollaborator) {
      console.log('💬 CONTRIBUTIONS API: Access denied for user:', user.userId)
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Fetch contributions for this memory with media attachments
    const { data: contributions, error: contributionsError } = await supabaseAdmin
      .from('memory_contributions')
      .select(`
        id,
        memory_id,
        contributor_id,
        contribution_type,
        content,
        created_at,
        contributor:users(
          id,
          email
        ),
        contribution_media_attachments(
          id,
          media_id,
          media:media(
            id,
            file_name,
            storage_url,
            type,
            file_size
          )
        )
      `)
      .eq('memory_id', memoryId)
      .order('created_at', { ascending: false })

    if (contributionsError) {
      console.error('💬 CONTRIBUTIONS API: Error fetching contributions:', contributionsError)
      return NextResponse.json(
        { error: 'Failed to fetch contributions' },
        { status: 500 }
      )
    }

    console.log('💬 CONTRIBUTIONS API: Found', contributions?.length || 0, 'contributions')

    // Transform the contributions to include media attachments in the expected format
    const transformedContributions = contributions?.map((contribution: any) => ({
      ...contribution,
      media_attachments: contribution.contribution_media_attachments?.map((attachment: any) => ({
        id: attachment.media.id,
        filename: attachment.media.filename,
        storage_url: attachment.media.storage_url,
        type: attachment.media.type,
        file_size: attachment.media.file_size
      })) || []
    })) || []

    // Remove the raw contribution_media_attachments from each contribution
    transformedContributions.forEach((contribution: any) => {
      delete contribution.contribution_media_attachments
    })

    return NextResponse.json({
      success: true,
      contributions: transformedContributions
    })

  } catch (error) {
    console.error('💬 CONTRIBUTIONS API: Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memoryId = params.id
    const body = await request.json()
    const { contribution_type, content, media_attachment_ids } = body

    console.log('💬 CONTRIBUTIONS API: Creating contribution:', { memoryId, contribution_type, content, media_attachment_ids })

    // Validate input
    if (!contribution_type || !content) {
      return NextResponse.json(
        { error: 'contribution_type and content are required' },
        { status: 400 }
      )
    }

    if (!['COMMENT', 'ADDITION', 'CORRECTION'].includes(contribution_type)) {
      return NextResponse.json(
        { error: 'Invalid contribution_type. Must be COMMENT, ADDITION, or CORRECTION' },
        { status: 400 }
      )
    }

    // Get authentication token
    const token = extractTokenFromHeader(request.headers.get('authorization') || undefined)
    
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify user
    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    // Check if user has access to this memory (owner or collaborator with comment permission)
    const { data: memory, error: memoryError } = await supabaseAdmin
      .from('memories')
      .select('id, user_id')
      .eq('id', memoryId)
      .single()

    if (memoryError || !memory) {
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      )
    }

    // Check if user owns the memory (owners can always comment)
    const isOwner = memory.user_id === user.userId

    // Check if user is a collaborator with comment permission
    const { data: collaboration, error: collaborationError } = await supabaseAdmin
      .from('memory_collaborations')
      .select('permissions, status')
      .eq('memory_id', memoryId)
      .eq('collaborator_id', user.userId)
      .eq('status', 'accepted')
      .single()

    const isCollaborator = !collaborationError && collaboration
    const canComment = isOwner || (isCollaborator && collaboration.permissions.includes('comment'))

    if (!canComment) {
      return NextResponse.json(
        { error: 'You do not have permission to add contributions to this memory' },
        { status: 403 }
      )
    }

    // Create the contribution
    const { data: contribution, error: contributionError } = await supabaseAdmin
      .from('memory_contributions')
      .insert({
        memory_id: memoryId,
        contributor_id: user.userId,
        contribution_type,
        content: content.trim()
      })
      .select(`
        id,
        memory_id,
        contributor_id,
        contribution_type,
        content,
        created_at,
        contributor:users(
          id,
          email
        )
      `)
      .single()

    if (contributionError) {
      console.error('💬 CONTRIBUTIONS API: Error creating contribution:', contributionError)
      return NextResponse.json(
        { error: 'Failed to create contribution' },
        { status: 500 }
      )
    }

    console.log('💬 CONTRIBUTIONS API: Contribution created successfully:', contribution.id)

    // Link media attachments if provided
    if (media_attachment_ids && media_attachment_ids.length > 0) {
      const attachmentInserts = media_attachment_ids.map((mediaId: string) => ({
        contribution_id: contribution.id,
        media_id: mediaId
      }))

      const { error: attachmentError } = await supabaseAdmin
        .from('contribution_media_attachments')
        .insert(attachmentInserts)

      if (attachmentError) {
        console.error('💬 CONTRIBUTIONS API: Error linking media attachments:', attachmentError)
        // Don't fail the whole operation, just log the error
      } else {
        console.log('💬 CONTRIBUTIONS API: Media attachments linked successfully')
      }
    }

    // Fetch the contribution with media attachments
    const { data: contributionWithMedia, error: fetchError } = await supabaseAdmin
      .from('memory_contributions')
      .select(`
        id,
        memory_id,
        contributor_id,
        contribution_type,
        content,
        created_at,
        contributor:users(
          id,
          email
        ),
        contribution_media_attachments(
          id,
          media_id,
          media:media(
            id,
            file_name,
            storage_url,
            type,
            file_size
          )
        )
      `)
      .eq('id', contribution.id)
      .single()

    if (fetchError) {
      console.error('💬 CONTRIBUTIONS API: Error fetching contribution with media:', fetchError)
      // Return the basic contribution if we can't fetch with media
      return NextResponse.json({
        success: true,
        contribution
      })
    }

    // Transform the media attachments to match the frontend interface
    const transformedContribution = {
      ...contributionWithMedia,
      media_attachments: contributionWithMedia.contribution_media_attachments?.map((attachment: any) => ({
        id: attachment.media.id,
        filename: attachment.media.filename,
        storage_url: attachment.media.storage_url,
        type: attachment.media.type,
        file_size: attachment.media.file_size
      })) || []
    }

    // Remove the raw contribution_media_attachments from the response
    delete (transformedContribution as any).contribution_media_attachments

    return NextResponse.json({
      success: true,
      contribution: transformedContribution
    })

  } catch (error) {
    console.error('💬 CONTRIBUTIONS API: Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}