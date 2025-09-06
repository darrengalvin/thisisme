import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'

// Simple board members API that returns mock data to test the frontend
export async function GET(
  request: NextRequest,
  { params }: { params: { boardId: string } }
) {
  try {
    const userId = await requireAuth(request)
    const { boardId } = params
    
    // Return mock members data for testing
    const mockMembers = [
      {
        id: 'member-1',
        user_id: userId,
        board_id: boardId,
        role: 'OWNER',
        permissions: {
          can_comment: true,
          can_tag_people: true,
          can_add_memories: true,
          can_upload_media: true,
          can_invite_others: true,
          can_view_memories: true,
          can_edit_own_contributions: true
        },
        status: 'ACTIVE',
        joined_at: new Date().toISOString(),
        user: {
          email: 'simposntest@ada.com'
        }
      }
    ]
    
    return NextResponse.json({ 
      success: true,
      members: mockMembers 
    })
  } catch (error) {
    console.error('Failed to fetch board members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    )
  }
}
