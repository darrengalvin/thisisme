import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// This route handles legacy local uploads that might exist
// New uploads should use Supabase Storage
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Join the path segments to create the file path
    const filePath = join(process.cwd(), 'public', 'uploads', ...params.path)
    
    // Security check - ensure we're only serving files from uploads directory
    const normalizedPath = join(process.cwd(), 'public', 'uploads')
    if (!filePath.startsWith(normalizedPath)) {
      return new NextResponse('Forbidden', { status: 403 })
    }
    
    // Check if file exists
    if (!existsSync(filePath)) {
      return new NextResponse('File not found', { status: 404 })
    }
    
    // Read and serve the file
    const fileBuffer = await readFile(filePath)
    
    // Determine content type based on file extension
    const extension = params.path[params.path.length - 1].split('.').pop()?.toLowerCase()
    let contentType = 'application/octet-stream'
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg'
        break
      case 'png':
        contentType = 'image/png'
        break
      case 'gif':
        contentType = 'image/gif'
        break
      case 'webp':
        contentType = 'image/webp'
        break
      case 'mp4':
        contentType = 'video/mp4'
        break
      case 'mp3':
        contentType = 'audio/mpeg'
        break
    }
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000'
      }
    })
    
  } catch (error) {
    console.error('Error serving upload file:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
