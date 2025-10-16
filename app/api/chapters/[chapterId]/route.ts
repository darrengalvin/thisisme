import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// GET /api/chapters/[chapterId] - Get chapter details
export async function GET(
  request: NextRequest,
  { params }: { params: { chapterId: string } }
) {
  try {
    const chapterId = params.chapterId

    console.log('📖 CHAPTER API: Fetching chapter:', chapterId)

    // Get chapter details
    const { data: chapter, error: chapterError } = await supabaseAdmin
      .from('timezones')
      .select(`
        id,
        title,
        description,
        user_id,
        created_at,
        updated_at
      `)
      .eq('id', chapterId)
      .single()

    if (chapterError || !chapter) {
      console.error('📖 CHAPTER API: Chapter not found:', chapterError)
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
    }

    console.log('📖 CHAPTER API: Chapter found:', chapter.title)

    return NextResponse.json({
      success: true,
      chapter: {
        id: chapter.id,
        title: chapter.title,
        description: chapter.description,
        created_at: chapter.created_at,
        updated_at: chapter.updated_at
      }
    })

  } catch (error) {
    console.error('Failed to fetch chapter:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chapter' },
      { status: 500 }
    )
  }
}




