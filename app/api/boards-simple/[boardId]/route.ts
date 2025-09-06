import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'

// Simple board details API that returns mock data to test the frontend
export async function GET(
  request: NextRequest,
  { params }: { params: { boardId: string } }
) {
  try {
    const userId = await requireAuth(request)
    const { boardId } = params
    
    // Return mock board data for testing
    const mockBoard = {
      id: boardId,
      title: 'My Personal Timeline',
      description: 'My personal memory timeline',
      board_type: 'PERSONAL',
      privacy_level: 'PRIVATE',
      owner_id: userId,
      user_role: 'OWNER',
      user_permissions: {
        can_comment: true,
        can_tag_people: true,
        can_add_memories: true,
        can_upload_media: true,
        can_invite_others: true,
        can_view_memories: true,
        can_edit_own_contributions: true
      },
      member_count: 1,
      memory_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      owner: {
        email: 'simposntest@ada.com'
      }
    }
    
    return NextResponse.json({ 
      success: true,
      board: mockBoard 
    })
  } catch (error) {
    console.error('Failed to fetch board:', error)
    return NextResponse.json(
      { error: 'Failed to fetch board' },
      { status: 500 }
    )
  }
}
