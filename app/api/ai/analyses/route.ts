import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all analyses
    const { data: analyses } = await supabase
      .from('ai_analyses')
      .select('*')
      .order('analyzed_at', { ascending: false })

    // Get all fixes
    const { data: fixes } = await supabase
      .from('ai_fixes')
      .select('*')
      .order('created_at', { ascending: false })

    return NextResponse.json({
      analyses: analyses || [],
      fixes: fixes || []
    })
  } catch (error) {
    console.error('Get analyses error:', error)
    return NextResponse.json({ error: 'Failed to load analyses' }, { status: 500 })
  }
}