import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const memoryId = params.id
    const token = request.headers.get('Authorization')?.split(' ')[1]

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to add media to this memory
    const { data: memory, error: memoryError } = await supabaseAdmin
      .from('memories')
      .select('user_id')
      .eq('id', memoryId)
      .single()

    if (memoryError || !memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
    }

    const isOwner = memory.user_id === user.userId
    let hasPermission = isOwner

    if (!isOwner) {
      // Check for collaboration permissions
      const { data: collaboration, error: collabError } = await supabaseAdmin
        .from('memory_collaborations')
        .select('permissions, status')
        .eq('memory_id', memoryId)
        .eq('collaborator_id', user.userId)
        .eq('status', 'accepted')
        .single()

      if (!collabError && collaboration) {
        hasPermission = collaboration.permissions.includes('add_images')
      }
    }

    if (!hasPermission) {
      return NextResponse.json({ 
        error: 'Access denied: Insufficient permissions' 
      }, { status: 403 })
    }

    // Parse the form data
    const formData = await request.formData()
    console.log('📁 MEDIA UPLOAD: Form data keys:', Array.from(formData.keys()))
    const files = formData.getAll('file') as File[]
    console.log('📁 MEDIA UPLOAD: Found', files.length, 'files')

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    const uploadedMedia = []

    for (const file of files) {
      try {
        console.log('📁 MEDIA UPLOAD: Processing file:', { name: file.name, size: file.size, type: file.type })
        // Generate unique filename
        const fileExtension = file.name.split('.').pop()
        const fileName = `${uuidv4()}.${fileExtension}`
        
        // Upload to Supabase Storage
        console.log('📁 MEDIA UPLOAD: Uploading to storage:', { bucket: 'files', path: `uploads/${user.userId}/${fileName}` })
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('files')
          .upload(`uploads/${user.userId}/${fileName}`, file)

        if (uploadError) {
          console.error('📁 MEDIA UPLOAD: Upload error:', uploadError)
          continue
        }
        console.log('📁 MEDIA UPLOAD: Upload successful:', uploadData)

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
          .from('files')
          .getPublicUrl(`uploads/${user.userId}/${fileName}`)

        // Determine file type
        let fileType = 'DOCUMENT'
        if (file.type.startsWith('image/')) {
          fileType = 'IMAGE'
        } else if (file.type.startsWith('video/')) {
          fileType = 'VIDEO'
        } else if (file.type.startsWith('audio/')) {
          fileType = 'AUDIO'
        }

        // Create media record in database
        const { data: mediaRecord, error: mediaError } = await supabaseAdmin
          .from('media')
          .insert({
            id: uuidv4(),
            memory_id: memoryId,
            file_name: file.name,
            storage_url: urlData.publicUrl,
            type: fileType,
            file_size: file.size,
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (mediaError) {
          console.error('Media record error:', mediaError)
          continue
        }

        uploadedMedia.push(mediaRecord)
      } catch (fileError) {
        console.error('File processing error:', fileError)
        continue
      }
    }

    if (uploadedMedia.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to upload any files' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${uploadedMedia.length} file(s)`,
      media: uploadedMedia
    })

  } catch (error) {
    console.error('Error in POST /api/memories/[id]/media:', error)
    return NextResponse.json(
      { error: 'Failed to upload media' },
      { status: 500 }
    )
  }
}
