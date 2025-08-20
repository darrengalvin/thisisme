'use client'

import { useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '@/components/AuthProvider'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface RealtimeCallbacks {
  onMemoryChange?: () => void
  onChapterChange?: () => void
  onNotificationChange?: () => void
}

export function useRealtimeUpdates(callbacks: RealtimeCallbacks) {
  const { user } = useAuth()

  const setupRealtimeSubscriptions = useCallback(() => {
    if (!user) return

    console.log('🔄 REALTIME: Setting up subscriptions for user:', user.id)

    // Subscribe to memories changes
    const memoriesChannel = supabase
      .channel('memories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memories',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 REALTIME: Memory change detected:', payload)
          callbacks.onMemoryChange?.()
        }
      )
      .subscribe()

    // Subscribe to chapters (timezones) changes
    const chaptersChannel = supabase
      .channel('chapters-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'timezones',
          filter: `creator_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 REALTIME: Chapter change detected:', payload)
          callbacks.onChapterChange?.()
        }
      )
      .subscribe()

    // Subscribe to notifications changes
    const notificationsChannel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔄 REALTIME: Notification change detected:', payload)
          callbacks.onNotificationChange?.()
        }
      )
      .subscribe()

    // Cleanup function
    return () => {
      console.log('🔄 REALTIME: Cleaning up subscriptions')
      supabase.removeChannel(memoriesChannel)
      supabase.removeChannel(chaptersChannel)
      supabase.removeChannel(notificationsChannel)
    }
  }, [user, callbacks])

  useEffect(() => {
    const cleanup = setupRealtimeSubscriptions()
    return cleanup
  }, [setupRealtimeSubscriptions])

  // Manual refresh function for immediate updates
  const refreshAll = useCallback(() => {
    console.log('🔄 REALTIME: Manual refresh triggered')
    callbacks.onMemoryChange?.()
    callbacks.onChapterChange?.()
    callbacks.onNotificationChange?.()
  }, [callbacks])

  return { refreshAll }
}
