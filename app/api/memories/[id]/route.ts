import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { writeFile } from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'

// Helper function to determine file type from MIME type
function getFileType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'IMAGE'
  if (mimeType.startsWith('video/')) return 'VIDEO'
  if (mimeType.startsWith('audio/')) return 'AUDIO'
  return 'OTHER'
}

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

    // Create Supabase client for potential file deletion
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

    // Delete specified media files
    for (const mediaId of mediaToDelete) {
      const mediaToRemove = existingMemory.media.find(m => m.id === mediaId)
      if (mediaToRemove) {
        // Delete physical files
        try {
          if (mediaToRemove.storageUrl) {
            if (mediaToRemove.storageUrl.startsWith('http')) {
              // Supabase Storage file - extract path and delete from Supabase
              const urlParts = mediaToRemove.storageUrl.split('/object/public/files/')
              if (urlParts.length > 1) {
                const storagePath = urlParts[1]
                const { error: deleteError } = await supabase.storage
                  .from('files')
                  .remove([storagePath])
                
                if (deleteError) {
                  console.error('⚠️ EDIT API: Failed to delete Supabase file:', deleteError)
                } else {
                  console.log('🗑️ EDIT API: Deleted Supabase file:', mediaToRemove.fileName)
                }
              }
            } else {
              // Local file - delete from filesystem
              const filePath = join(process.cwd(), 'public', mediaToRemove.storageUrl)
              await unlink(filePath)
              console.log('🗑️ EDIT API: Deleted local file:', mediaToRemove.fileName)
            }
          }
          if (mediaToRemove.thumbnailUrl && mediaToRemove.thumbnailUrl !== mediaToRemove.storageUrl) {
            if (mediaToRemove.thumbnailUrl.startsWith('http')) {
              // Supabase Storage thumbnail
              const urlParts = mediaToRemove.thumbnailUrl.split('/object/public/files/')
              if (urlParts.length > 1) {
                const storagePath = urlParts[1]
                await supabase.storage.from('files').remove([storagePath])
              }
            } else {
              // Local thumbnail
              const thumbnailPath = join(process.cwd(), 'public', mediaToRemove.thumbnailUrl)
              await unlink(thumbnailPath)
            }
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

    // Upload new media files to Supabase Storage
    const newMediaRecords = []

    for (const file of newMediaFiles) {
      if (file instanceof File && file.size > 0) {
        try {
          // Generate unique filename for Supabase Storage
          const fileId = uuidv4()
          const fileExtension = file.name.split('.').pop()
          const fileName = `${fileId}.${fileExtension}`
          const filePath = `uploads/${user.userId}/${fileName}`

          console.log('💾 EDIT API: Uploading to Supabase Storage:', { fileName, filePath })

          // Upload file to Supabase Storage
          const bytes = await file.arrayBuffer()
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('files')
            .upload(filePath, bytes, {
              cacheControl: '3600',
              upsert: false,
              contentType: file.type
            })

          if (uploadError) {
            console.error('❌ EDIT API: Supabase Storage upload failed:', uploadError)
            continue
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('files')
            .getPublicUrl(filePath)

          console.log('✅ EDIT API: File uploaded to Supabase:', { path: uploadData.path, publicUrl })

          // Determine media type
          const mediaType = getFileType(file.type)
          console.log('🎯 EDIT API: Media type:', mediaType, 'from MIME:', file.type)
          
          // Create media record
          const mediaRecord = await prisma.media.create({
            data: {
              memoryId: memoryId,
              type: mediaType,
              storageUrl: publicUrl,
              thumbnailUrl: mediaType === 'IMAGE' ? publicUrl : null,
              fileSize: file.size,
              mimeType: file.type,
              fileName: file.name
            }
          })
          
          newMediaRecords.push(mediaRecord)
        } catch (error) {
          console.error('❌ EDIT API: Error uploading file:', error)
          continue
        }
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
          // Check if this is a Supabase Storage URL or local file
          if (media.storage_url.startsWith('http')) {
            // Supabase Storage file - extract path and delete from Supabase
            const urlParts = media.storage_url.split('/object/public/files/')
            if (urlParts.length > 1) {
              const storagePath = urlParts[1]
              const { error: deleteError } = await supabase.storage
                .from('files')
                .remove([storagePath])
              
              if (deleteError) {
                console.error('⚠️ DELETE API: Failed to delete Supabase file:', deleteError)
              } else {
                console.log('🗑️ DELETE API: Deleted Supabase file:', media.file_name)
              }
            }
          } else {
            // Local file - delete from filesystem
            const filePath = join(process.cwd(), 'public', media.storage_url)
            await unlink(filePath)
            console.log('🗑️ DELETE API: Deleted local file:', media.file_name)
          }
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