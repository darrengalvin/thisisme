import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { writeFile } from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import { getFileType } from '@/lib/utils'



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
    
    // Create Supabase client
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
    
    // Get existing memory to check ownership
    const { data: existingMemory, error: fetchError } = await supabase
      .from('memories')
      .select(`
        *,
        media(*)
      `)
      .eq('id', memoryId)
      .single()

    if (fetchError || !existingMemory) {
      return NextResponse.json(
        { success: false, error: 'Memory not found' },
        { status: 404 }
      )
    }

    // Check if user owns the memory
    if (existingMemory.user_id !== user.userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const title = formData.get('title') as string
    const textContent = formData.get('textContent') as string
    const chapterId = formData.get('timeZoneId') as string // Keep timeZoneId for backward compatibility
    const taggedPeopleJson = formData.get('taggedPeople') as string
    const taggedPeople = taggedPeopleJson ? JSON.parse(taggedPeopleJson) : []
    const mediaToDelete = formData.getAll('deleteMedia') as string[]
    const newMediaFiles = formData.getAll('media') as File[]

    // Delete specified media files
    for (const mediaId of mediaToDelete) {
      const mediaToRemove = existingMemory.media.find((m: any) => m.id === mediaId)
      if (mediaToRemove) {
        // Delete physical files
        try {
          if (mediaToRemove.storage_url) {
            if (mediaToRemove.storage_url.startsWith('http')) {
              // Supabase Storage file - extract path and delete from Supabase
              const urlParts = mediaToRemove.storage_url.split('/object/public/files/')
              if (urlParts.length > 1) {
                const storagePath = urlParts[1]
                const { error: deleteError } = await supabase.storage
                  .from('files')
                  .remove([storagePath])
                
                if (deleteError) {
                  console.error('⚠️ EDIT API: Failed to delete Supabase file:', deleteError)
                } else {
                  console.log('🗑️ EDIT API: Deleted Supabase file:', mediaToRemove.file_name)
                }
              }
            } else {
              // Local file - delete from filesystem
              const filePath = join(process.cwd(), 'public', mediaToRemove.storage_url)
              await unlink(filePath)
              console.log('🗑️ EDIT API: Deleted local file:', mediaToRemove.file_name)
            }
          }
          if (mediaToRemove.thumbnail_url && mediaToRemove.thumbnail_url !== mediaToRemove.storage_url) {
            if (mediaToRemove.thumbnail_url.startsWith('http')) {
              // Supabase Storage thumbnail
              const urlParts = mediaToRemove.thumbnail_url.split('/object/public/files/')
              if (urlParts.length > 1) {
                const storagePath = urlParts[1]
                await supabase.storage.from('files').remove([storagePath])
              }
            } else {
              // Local thumbnail
              const thumbnailPath = join(process.cwd(), 'public', mediaToRemove.thumbnail_url)
              await unlink(thumbnailPath)
            }
          }
        } catch (error) {
          console.log('File deletion error (file may not exist):', error)
        }
        
        // Delete from database using Supabase
        await supabase
          .from('media')
          .delete()
          .eq('id', mediaId)
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
          
          // Create media record using Supabase
          const { data: mediaRecord, error: mediaError } = await supabase
            .from('media')
            .insert({
              memory_id: memoryId,
              type: mediaType,
              storage_url: publicUrl,
              thumbnail_url: mediaType === 'IMAGE' ? publicUrl : null,
              file_size: file.size,
              mime_type: file.type,
              file_name: file.name
            })
            .select()
            .single()

          if (mediaError) {
            console.error('❌ EDIT API: Media record creation failed:', mediaError)
            continue
          }
          
          newMediaRecords.push(mediaRecord)
        } catch (error) {
          console.error('❌ EDIT API: Error uploading file:', error)
          continue
        }
      }
    }

    // Update memory using Supabase
    const { error: updateError } = await supabase
      .from('memories')
      .update({
        title: title || null,
        text_content: textContent || null,
        chapter_id: chapterId || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', memoryId)

    if (updateError) {
      console.error('❌ EDIT API: Failed to update memory:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update memory' },
        { status: 500 }
      )
    }

    // Handle tagged people updates
    if (taggedPeople && taggedPeople.length > 0) {
      // First, delete existing tags for this memory
      await supabase
        .from('memory_tags')
        .delete()
        .eq('memory_id', memoryId)

      // Add new tags
      for (const personName of taggedPeople) {
        // Find or create person in user's network
        let { data: networkPerson } = await supabase
          .from('user_networks')
          .select('id')
          .eq('owner_id', user.userId)
          .eq('person_name', personName)
          .single()

        if (!networkPerson) {
          // Create new person in network
          const { data: newPerson } = await supabase
            .from('user_networks')
            .insert({
              owner_id: user.userId,
              person_name: personName
            })
            .select('id')
            .single()
          
          networkPerson = newPerson
        }

        if (networkPerson) {
          // Create memory tag
          await supabase
            .from('memory_tags')
            .insert({
              memory_id: memoryId,
              tagged_person_id: networkPerson.id,
              tagged_by_user_id: user.userId
            })
        }
      }
    } else {
      // If no tagged people, remove all existing tags
      await supabase
        .from('memory_tags')
        .delete()
        .eq('memory_id', memoryId)
    }

    // Get complete updated memory with relations
    const { data: updatedMemory, error: fetchUpdatedError } = await supabase
      .from('memories')
      .select(`
        *,
        user:users!memories_user_id_fkey(id, email),
        chapter:chapters!memories_chapter_id_fkey(id, title, type),
        media(*)
      `)
      .eq('id', memoryId)
      .single()

    if (fetchUpdatedError) {
      console.error('❌ EDIT API: Failed to fetch updated memory:', fetchUpdatedError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch updated memory' },
        { status: 500 }
      )
    }

    // Transform data to match expected format
    const transformedMemory = {
      ...updatedMemory,
      id: updatedMemory.id,
      title: updatedMemory.title,
      textContent: updatedMemory.text_content,
      userId: updatedMemory.user_id,
      timeZoneId: updatedMemory.chapter_id, // Keep timeZoneId for backward compatibility
      datePrecision: updatedMemory.date_precision,
      approximateDate: updatedMemory.approximate_date,
      createdAt: updatedMemory.created_at,
      updatedAt: updatedMemory.updated_at,
      user: updatedMemory.user,
      timeZone: updatedMemory.chapter, // Keep timeZone for backward compatibility
      media: updatedMemory.media || []
    }

    return NextResponse.json({
      success: true,
      memory: transformedMemory
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