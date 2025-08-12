import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify JWT token and extract user ID
    const { verifyToken } = await import('@/lib/auth')
    const userInfo = await verifyToken(token)
    
    if (!userInfo) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
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