import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { verifyToken } from '@/lib/auth'

// GET /api/notifications - Fetch user's notifications
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    console.log('🔔 NOTIFICATIONS API: Fetching notifications for user:', user.userId)

    // Fetch notifications for the user
    const { data: notifications, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false })
      .limit(50) // Limit to recent 50 notifications

    if (error) {
      console.error('🔔 NOTIFICATIONS API: Error fetching notifications:', error)
      throw error
    }

    console.log('🔔 NOTIFICATIONS API: Found', notifications?.length || 0, 'notifications')

    // Count unread notifications
    const unreadCount = notifications?.filter(n => !n.is_read).length || 0

    return NextResponse.json({
      success: true,
      notifications: notifications || [],
      unreadCount
    })

  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

// POST /api/notifications/mark-read - Mark notifications as read
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationIds, markAllRead } = body

    console.log('🔔 NOTIFICATIONS API: Marking notifications as read:', { notificationIds, markAllRead })

    if (markAllRead) {
      // Mark all notifications as read for this user
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.userId)
        .eq('is_read', false)

      if (error) throw error

      console.log('🔔 NOTIFICATIONS API: Marked all notifications as read')
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.userId)
        .in('id', notificationIds)

      if (error) throw error

      console.log('🔔 NOTIFICATIONS API: Marked', notificationIds.length, 'notifications as read')
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Failed to mark notifications as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    )
  }
}
