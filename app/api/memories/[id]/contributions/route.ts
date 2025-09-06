import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { verifyToken } from '@/lib/auth'

// Get contributions for a memory
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id: memoryId } = params

    // Verify user can access this memory
    const { data: memory } = await supabaseAdmin
      .from('memories')
      .select(`
        id,
        user_id,
        timezone_id,
        timezones!inner(id)
      `)
      .eq('id', memoryId)
      .single()

    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
    }

    // Check if user can access this memory (owner or timezone member)
    const canAccess = memory.user_id === user.userId || (
      memory.timezone_id && await checkTimezoneMembership(memory.timezone_id, user.userId)
    )

    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get contributions with contributor details
    const { data: contributions, error } = await supabaseAdmin
      .from('memory_contributions')
      .select(`
        id,
        memory_id,
        contributor_id,
        contribution_type,
        content,
        created_at,
        updated_at,
        users!memory_contributions_contributor_id_fkey(
          id,
          email
        )
      `)
      .eq('memory_id', memoryId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({
      success: true,
      contributions: contributions || []
    })
  } catch (error) {
    console.error('Failed to fetch memory contributions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contributions' },
      { status: 500 }
    )
  }
}

// Add contribution to a memory
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id: memoryId } = params
    const body = await request.json()
    const { contribution_type, content } = body

    if (!contribution_type || !['COMMENT', 'ADDITION', 'CORRECTION'].includes(contribution_type)) {
      return NextResponse.json({ error: 'Valid contribution_type is required' }, { status: 400 })
    }

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Verify memory exists and user can contribute
    const { data: memory } = await supabaseAdmin
      .from('memories')
      .select('id, user_id, timezone_id')
      .eq('id', memoryId)
      .single()

    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
    }

    // Check if user can contribute
    let canContribute = false
    
    // Memory owner can always contribute to their own memories
    if (memory.user_id === user.userId) {
      canContribute = true
    }
    // If memory is in a chapter, check if user is a member
    else if (memory.timezone_id) {
      canContribute = await checkTimezoneMembership(memory.timezone_id, user.userId)
    }
    
    if (!canContribute) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Create contribution
    const { data: newContribution, error } = await supabaseAdmin
      .from('memory_contributions')
      .insert({
        memory_id: memoryId,
        contributor_id: user.userId,
        contribution_type,
        content: content.trim()
      })
      .select(`
        id,
        memory_id,
        contributor_id,
        contribution_type,
        content,
        created_at,
        updated_at,
        users!memory_contributions_contributor_id_fkey(
          id,
          email
        )
      `)
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      contribution: newContribution
    })
  } catch (error) {
    console.error('Failed to add memory contribution:', error)
    return NextResponse.json(
      { error: 'Failed to add contribution' },
      { status: 500 }
    )
  }
}

// Helper function to check timezone membership
async function checkTimezoneMembership(timezoneId: string, userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('timezone_members')
    .select('id')
    .eq('timezone_id', timezoneId)
    .eq('user_id', userId)
    .single()
  
  return !!data
}
