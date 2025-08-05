import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { writeFile } from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const memoryId = params.id
    
    // Get existing memory to check ownership
    const existingMemory = await prisma.memory.findUnique({
      where: { id: memoryId },
      include: { media: true }
    })

    if (!existingMemory) {
      return NextResponse.json(
        { success: false, error: 'Memory not found' },
        { status: 404 }
      )
    }

    // Check if user owns the memory
    if (existingMemory.userId !== user.userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const title = formData.get('title') as string
    const textContent = formData.get('textContent') as string
    const mediaToDelete = formData.getAll('deleteMedia') as string[]
    const newMediaFiles = formData.getAll('media') as File[]

    // Delete specified media files
    for (const mediaId of mediaToDelete) {
      const mediaToRemove = existingMemory.media.find(m => m.id === mediaId)
      if (mediaToRemove) {
        // Delete physical files
        try {
          if (mediaToRemove.storage_url) {
            const filePath = join(process.cwd(), 'public', mediaToRemove.storage_url)
            await unlink(filePath)
          }
          if (mediaToRemove.thumbnail_url) {
            const thumbnailPath = join(process.cwd(), 'public', mediaToRemove.thumbnail_url)
            await unlink(thumbnailPath)
          }
        } catch (error) {
          console.log('File deletion error (file may not exist):', error)
        }
        
        // Delete from database
        await prisma.media.delete({
          where: { id: mediaId }
        })
      }
    }

    // Upload new media files
    const uploadDir = join(process.cwd(), 'public', 'uploads')
    const newMediaRecords = []

    for (const file of newMediaFiles) {
      if (file instanceof File && file.size > 0) {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        
        const fileExtension = file.name.split('.').pop()
        const uniqueFilename = `${uuidv4()}.${fileExtension}`
        const filePath = join(uploadDir, uniqueFilename)
        
        await writeFile(filePath, buffer)
        
        // Determine file type
        let mediaType = 'OTHER'
        if (file.type.startsWith('image/')) {
          mediaType = 'IMAGE'
        } else if (file.type.startsWith('video/')) {
          mediaType = 'VIDEO'
        } else if (file.type.startsWith('audio/')) {
          mediaType = 'AUDIO'
        }
        
        // Create media record
        const mediaRecord = await prisma.media.create({
          data: {
            memoryId: memoryId,
            type: mediaType,
            storage_url: `/uploads/${uniqueFilename}`,
            thumbnail_url: mediaType === 'IMAGE' ? `/uploads/${uniqueFilename}` : null,
            file_size: file.size,
            mime_type: file.type,
            original_filename: file.name
          }
        })
        
        newMediaRecords.push(mediaRecord)
      }
    }

    // Update memory
    const updatedMemory = await prisma.memory.update({
      where: { id: memoryId },
      data: {
        title: title || null,
        textContent: textContent || null,
        updatedAt: new Date()
      },
      include: {
        media: true,
        timeZone: true
      }
    })

    return NextResponse.json({
      success: true,
      memory: updatedMemory
    })

  } catch (error) {
    console.error('Update memory error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const memoryId = params.id

    // Use service role client to bypass RLS (same as GET route)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('🗑️ DELETE API: Looking for memory in Supabase:', memoryId)

    // Get memory with media from Supabase
    const { data: memory, error: fetchError } = await supabase
      .from('memories')
      .select(`
        *,
        media(*)
      `)
      .eq('id', memoryId)
      .eq('user_id', user.userId) // Ensure user owns the memory
      .single()

    if (fetchError || !memory) {
      console.log('❌ DELETE API: Memory not found in Supabase:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Memory not found' },
        { status: 404 }
      )
    }

    console.log('✅ DELETE API: Found memory in Supabase:', memory.title)

    // Delete associated media files from storage
    if (memory.media && memory.media.length > 0) {
      for (const media of memory.media) {
        try {
          const filePath = join(process.cwd(), 'public', media.storage_url)
          await unlink(filePath)
          console.log('🗑️ DELETE API: Deleted file:', media.file_name)
        } catch (fileError) {
          console.error('⚠️ DELETE API: Failed to delete file:', fileError)
          // Continue with deletion even if file removal fails
        }
      }
    }

    // Delete media records from Supabase
    if (memory.media && memory.media.length > 0) {
      const { error: mediaDeleteError } = await supabase
        .from('media')
        .delete()
        .eq('memory_id', memoryId)

      if (mediaDeleteError) {
        console.error('⚠️ DELETE API: Failed to delete media records:', mediaDeleteError)
        // Continue with memory deletion
      }
    }

    // Delete memory from Supabase
    const { error: deleteError } = await supabase
      .from('memories')
      .delete()
      .eq('id', memoryId)
      .eq('user_id', user.userId) // Double-check ownership

    if (deleteError) {
      console.error('❌ DELETE API: Failed to delete memory from Supabase:', deleteError)
      return NextResponse.json(
        { success: false, error: 'Failed to delete memory' },
        { status: 500 }
      )
    }

    console.log('🎉 DELETE API: Successfully deleted memory from Supabase')

    return NextResponse.json({
      success: true,
      message: 'Memory deleted successfully'
    })

  } catch (error) {
    console.error('💥 DELETE API: Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 