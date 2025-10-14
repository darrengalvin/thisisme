import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

// Create Supabase admin client directly
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Get memories tagged with a specific person
export async function GET(
  request: NextRequest,
  { params }: { params: { personId: string } }
) {
  try {
    // Get user from JWT token
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { personId } = params

    // First verify this person belongs to the user
    const { data: person, error: personError } = await supabaseAdmin
      .from('user_networks')
      .select('*')
      .eq('id', personId)
      .eq('owner_id', user.userId)
      .single()

    if (personError || !person) {
      return NextResponse.json({ error: 'Person not found or access denied' }, { status: 404 })
    }

    console.log('🔍 PERSON MEMORIES API: Fetching memories for person:', personId)
    
    // Get memories tagged with this person
    const { data: taggedMemories, error: memoriesError } = await supabaseAdmin
      .from('memory_tags')
      .select(`
        memory_id,
        created_at,
        memories (
          id,
          title,
          text_content,
          image_url,
          created_at,
          chapter_id,
          chapters!memories_chapter_id_fkey (
            title
          ),
          media (
            id,
            file_url,
            file_type
          )
        )
      `)
      .eq('tagged_person_id', personId)
      .order('created_at', { ascending: false })
      
    console.log('🔍 PERSON MEMORIES API: Found', taggedMemories?.length || 0, 'tagged memories')
    console.log('🔍 PERSON MEMORIES API: Raw data:', JSON.stringify(taggedMemories, null, 2))

    if (memoriesError) {
      console.error('❌ PERSON MEMORIES API: Error fetching tagged memories:', memoriesError)
      console.error('❌ PERSON MEMORIES API: Error details:', JSON.stringify(memoriesError, null, 2))
      return NextResponse.json({ 
        error: 'Failed to fetch memories', 
        details: memoriesError.message 
      }, { status: 500 })
    }

    if (!taggedMemories || taggedMemories.length === 0) {
      console.log('⚠️ PERSON MEMORIES API: No tagged memories found for person:', personId)
      console.log('⚠️ PERSON MEMORIES API: This person may not be tagged in any photos yet')
    }

    // Transform the data to be more usable
    const memories = taggedMemories?.map((tag: any) => ({
      id: tag.memories.id,
      title: tag.memories.title,
      description: tag.memories.text_content,
      text_content: tag.memories.text_content,
      image_url: tag.memories.image_url || tag.memories.media?.[0]?.file_url, // Use image_url or first media file
      memory_date: tag.memories.created_at, // Using created_at as memory_date
      tagged_at: tag.created_at,
      chapter: tag.memories.chapters?.title || 'Personal',
      media: tag.memories.media || []
    })) || []

    return NextResponse.json({
      success: true,
      person,
      memories,
      total_memories: memories.length
    })
  } catch (error) {
    console.error('Failed to fetch person memories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch person memories' },
      { status: 500 }
    )
  }
}
