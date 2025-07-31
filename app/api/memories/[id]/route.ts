import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyToken, extractTokenFromHeader } from '@/lib/auth'
import { unlink } from 'fs/promises'
import { join } from 'path'

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
    const { title, textContent } = await request.json()

    // Get existing memory to check ownership
    const existingMemory = await prisma.memory.findUnique({
      where: { id: memoryId }
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

    // Get memory with media
    const memory = await prisma.memory.findUnique({
      where: { id: memoryId },
      include: {
        media: true
      }
    })

    if (!memory) {
      return NextResponse.json(
        { success: false, error: 'Memory not found' },
        { status: 404 }
      )
    }

    // Check if user owns the memory
    if (memory.userId !== user.userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Delete associated media files
    for (const media of memory.media) {
      try {
        const filePath = join(process.cwd(), 'public', media.storageUrl)
        await unlink(filePath)
      } catch (fileError) {
        console.error('Failed to delete file:', fileError)
        // Continue with deletion even if file removal fails
      }
    }

    // Delete memory (cascade will delete media records)
    await prisma.memory.delete({
      where: { id: memoryId }
    })

    return NextResponse.json({
      success: true,
      message: 'Memory deleted successfully'
    })

  } catch (error) {
    console.error('Delete memory error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 