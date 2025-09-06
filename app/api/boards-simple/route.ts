import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'

// Simple boards API that returns mock data to test the frontend
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth(request)
    
    // Return mock board data for testing
    const mockBoards = [
      {
        id: '0580110f-89a6-456a-8a25-6c71675c69e4',
        title: 'My Personal Timeline',
        description: 'My personal memory timeline',
        board_type: 'PERSONAL',
        privacy_level: 'PRIVATE',
        owner_id: userId,
        user_role: 'OWNER',
        member_count: 1,
        memory_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        owner: {
          email: 'simposntest@ada.com'
        }
      }
    ]
    
    return NextResponse.json({ 
      success: true,
      boards: mockBoards 
    })
  } catch (error) {
    console.error('Failed to fetch boards:', error)
    return NextResponse.json(
      { error: 'Failed to fetch boards' },
      { status: 500 }
    )
  }
}
