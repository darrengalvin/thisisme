'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Plus, User, LogOut, Menu, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import MemoryViews from './MemoryViews'
import GroupManager from './GroupManager'
import CreateMemory from './CreateMemory'
import CreateTimeZone from './CreateTimeZone'
import UserProfile from './UserProfile'
import ChronologicalTimelineView from './ChronologicalTimelineView'
import AddMemoryWizard from './AddMemoryWizard'
import TimelineView from './TimelineView'
import EditMemoryModal from './EditMemoryModal'
import DeleteConfirmationModal from './DeleteConfirmationModal'
import { useAuth } from '@/components/AuthProvider'
import { MemoryWithRelations } from '@/lib/types'

type TabType = 'home' | 'timeline' | 'create' | 'timezones' | 'create-timezone' | 'profile'

interface UserType {
  id: string
  email: string
  birthYear?: number
}

export default function Dashboard() {
  const { user: supabaseUser } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [memories, setMemories] = useState<MemoryWithRelations[]>([])
  const [user, setUser] = useState<UserType | null>(null)
  const [showMemoryWizard, setShowMemoryWizard] = useState(false)
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [selectedChapterTitle, setSelectedChapterTitle] = useState<string>('')
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showViewDropdown, setShowViewDropdown] = useState(false)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [isNewUser, setIsNewUser] = useState(false)
  const [timelineControls, setTimelineControls] = useState<{
    zoomLevel: string
    currentYear: number
    formatLabel: () => string
    handlers: {
      zoomIn: () => void
      zoomOut: () => void
      navigatePrev: () => void
      navigateNext: () => void
      canZoomIn: boolean
      canZoomOut: boolean
    }
  } | null>(null)
  const [editingMemory, setEditingMemory] = useState<MemoryWithRelations | null>(null)
  const [showEditMemoryModal, setShowEditMemoryModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [memoryToDelete, setMemoryToDelete] = useState<MemoryWithRelations | null>(null)
  const [isDeletingMemory, setIsDeletingMemory] = useState(false)
  const [failedDeletes, setFailedDeletes] = useState<Set<string>>(new Set())
  const [permanentlyDeleted, setPermanentlyDeleted] = useState<Set<string>>(new Set())
  const [showForceDeleteOption, setShowForceDeleteOption] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  
  const router = useRouter()

  useEffect(() => {
    if (supabaseUser) {
      fetchUserAndMemories()
    }
  }, [supabaseUser])

  // Refetch data when returning to timeline views after profile changes
  useEffect(() => {
    if (supabaseUser && (activeTab === 'home' || activeTab === 'timeline')) {
      fetchUserAndMemories()
    }
    
    // Clear timeline controls when not on timeline view
    if (activeTab !== 'timeline') {
      setTimelineControls(null)
    }
  }, [activeTab, supabaseUser])

  // Auto-refresh data when window regains focus to prevent stale data issues
  useEffect(() => {
    const handleFocus = () => {
      if (supabaseUser && (activeTab === 'home' || activeTab === 'timeline')) {
        console.log('🔄 DASHBOARD: Window focused - refreshing data to prevent stale state')
        // Clear failed deletes on focus to allow retry (but keep permanently deleted)
        if (failedDeletes.size > 0) {
          console.log('🧹 DASHBOARD: Clearing failed deletes on window focus to allow retry (keeping permanently deleted)')
          setFailedDeletes(new Set())
        }
        fetchUserAndMemories()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [supabaseUser, activeTab, failedDeletes.size, permanentlyDeleted.size])

  const fetchUserAndMemories = async () => {
    await Promise.all([fetchUser(), fetchMemories()])
  }

  const fetchMemories = async () => {
    try {
      if (!supabaseUser) {
        console.log('No Supabase user found')
        return
      }

      // Get custom JWT token for API
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: supabaseUser.id, email: supabaseUser.email }),
      })

      if (!tokenResponse.ok) {
        console.error('Failed to get auth token')
        return
      }

      const { token } = await tokenResponse.json()

      const response = await fetch('/api/memories', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('📊 DASHBOARD: Fetched memories response:', data)
        const newMemories = data.data || []
        
        // Log detailed memory info for debugging sync issues
        console.log('🔍 DASHBOARD: Memory details:', newMemories.map(m => ({
          id: m.id?.slice(0, 8) + '...',
          title: m.title || 'Untitled',
          createdAt: m.createdAt,
          ageInMinutes: m.createdAt ? Math.round((Date.now() - new Date(m.createdAt).getTime()) / 60000) : 'unknown'
        })))
        
        // Log current failed deletes and permanent deletes for debugging
        if (failedDeletes.size > 0) {
          console.log('🚫 DASHBOARD: Currently tracking failed deletes:', 
            Array.from(failedDeletes).map(id => id.slice(0, 8) + '...')
          )
        }
        if (permanentlyDeleted.size > 0) {
          console.log('🔒 DASHBOARD: Currently tracking permanently deleted:', 
            Array.from(permanentlyDeleted).map(id => id.slice(0, 8) + '...')
          )
        }
        
        // Filter out memories that have failed to delete OR been permanently deleted
        const filteredMemories = newMemories.filter(memory => 
          !failedDeletes.has(memory.id) && !permanentlyDeleted.has(memory.id)
        )
        
        const failedCount = newMemories.filter(m => failedDeletes.has(m.id)).length
        const permanentCount = newMemories.filter(m => permanentlyDeleted.has(m.id)).length
        const totalFiltered = failedCount + permanentCount
        
        if (totalFiltered > 0) {
          console.log(`🚫 DASHBOARD: Filtered out ${totalFiltered} memories (${failedCount} failed deletes, ${permanentCount} permanently deleted)`)
        }
        
        setMemories(filteredMemories)
      } else {
        console.error('Failed to fetch memories:', response.status)
      }
    } catch (error) {
      console.error('Error fetching memories:', error)
    }
  }

  const fetchUser = async () => {
    try {
      if (!supabaseUser) {
        console.log('No Supabase user found')
        return
      }

      // Get custom JWT token for API
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: supabaseUser.id, email: supabaseUser.email }),
      })

      if (!tokenResponse.ok) {
        console.error('Failed to get auth token for user profile')
        return
      }

      const { token } = await tokenResponse.json()

      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('👤 USER PROFILE DATA:', data)
        console.log('👤 USER BIRTH YEAR:', data.data?.birthYear)
        setUser(data.data)
        
        // Set isNewUser flag based on account creation time (more generous window)
        const isRecent = data.data?.createdAt && new Date(data.data.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours
        if (isRecent) {
          console.log('🆕 New user detected - will show detailed welcome experience')
          setIsNewUser(true)
        }
      } else {
        console.error('Failed to fetch user profile:', response.status)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setIsLoadingUser(false)
    }
  }



  const handleLogout = async () => {
    try {
      // Clear any legacy tokens
      localStorage.removeItem('authToken')
      document.cookie = 'auth-token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;'
      
      // Use Supabase logout
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      await supabase.auth.signOut()
      
      router.push('/auth/login')
    } catch (error) {
      console.error('Logout error:', error)
      router.push('/auth/login')
    }
  }

  const handleCreateMemory = (chapterId?: string, chapterTitle?: string) => {
    setSelectedChapterId(chapterId || null)
    setSelectedChapterTitle(chapterTitle || '')
    setShowMemoryWizard(true)
  }

  const handleMemoryCreated = () => {
    setShowMemoryWizard(false)
    setSelectedChapterId(null)
    setSelectedChapterTitle('')
    // Refresh data to ensure new memory appears
    if (supabaseUser) {
      console.log('🆕 DASHBOARD: Memory created - refreshing data with slight delay to ensure DB consistency')
      // Add a small delay to ensure database consistency before refresh
      setTimeout(() => {
        fetchUserAndMemories()
      }, 500)
    }
    toast.success('Memory created successfully!')
  }

  const handleEditMemory = (memory: MemoryWithRelations) => {
    setEditingMemory(memory)
    setShowEditMemoryModal(true)
  }

  const handleDeleteMemory = (memory: MemoryWithRelations) => {
    // Check if this memory was very recently created (within last 30 seconds)
    const memoryAge = memory.createdAt ? Date.now() - new Date(memory.createdAt).getTime() : 0
    const isVeryRecent = memoryAge < 30 * 1000 // 30 seconds
    
    // Check if this memory has failed to delete before
    const hasPreviouslyFailed = failedDeletes.has(memory.id)
    
    // Log current failed deletes for debugging
    console.log('🔍 DASHBOARD: Current failed deletes:', Array.from(failedDeletes))
    console.log('🔍 DASHBOARD: Checking memory ID:', memory.id)
    console.log('🔍 DASHBOARD: hasPreviouslyFailed:', hasPreviouslyFailed)
    
    if (isVeryRecent) {
      console.log('⚠️ DASHBOARD: Attempting to delete very recent memory - might have sync issues')
      console.log(`⏰ DASHBOARD: Memory age: ${Math.round(memoryAge / 1000)}s, ID: ${memory.id}`)
    }
    
    if (hasPreviouslyFailed) {
      console.log('🚨 DASHBOARD: This memory has failed to delete before - offering force delete option')
    } else {
      console.log('ℹ️ DASHBOARD: This memory has not failed to delete before')
    }
    
    // CRITICAL: If this memory is supposed to be filtered out but is still showing, 
    // it means there's a sync issue - treat it as previously failed
    const shouldHaveBeenFiltered = failedDeletes.has(memory.id)
    const effectivelyFailed = hasPreviouslyFailed || shouldHaveBeenFiltered
    
    if (shouldHaveBeenFiltered && !hasPreviouslyFailed) {
      console.log('🚨 DASHBOARD: SYNC ISSUE - Memory should have been filtered but is still visible!')
    }
    
    console.log('🗑️ DASHBOARD: Preparing to delete memory:', {
      id: memory.id,
      title: memory.title || 'Untitled',
      createdAt: memory.createdAt,
      ageInSeconds: Math.round(memoryAge / 1000),
      hasPreviouslyFailed,
      shouldHaveBeenFiltered,
      effectivelyFailed
    })
    
    setMemoryToDelete(memory)
    setShowForceDeleteOption(effectivelyFailed)
    setShowDeleteModal(true)
  }

  const forceDeleteMemory = () => {
    if (!memoryToDelete) return
    
    console.log('💥 DASHBOARD: FORCE DELETING memory - skipping API call:', memoryToDelete.id)
    
    // Aggressively remove from all possible states
    setMemories(prevMemories => {
      const filtered = prevMemories.filter(m => m.id !== memoryToDelete.id)
      console.log(`🧹 DASHBOARD: FORCE DELETE - removed from memories: ${prevMemories.length} → ${filtered.length}`)
      return filtered
    })
    
    // Add to failed deletes to prevent reappearance
    setFailedDeletes(prev => new Set([...prev, memoryToDelete.id]))
    
    // Close modal
    setShowDeleteModal(false)
    setShowForceDeleteOption(false)
    setMemoryToDelete(null)
    setIsDeletingMemory(false)
    
    toast.success('Memory force-deleted from view')
    
    console.log('🎯 DASHBOARD: Force delete complete - memory should be gone from UI')
  }

  const confirmDeleteMemory = async () => {
    if (!memoryToDelete || !supabaseUser) return
    
    setIsDeletingMemory(true)
    try {
      console.log('🗑️ DASHBOARD: Deleting memory:', memoryToDelete.id)
      
      // Get custom JWT token for API
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: supabaseUser.id, email: supabaseUser.email }),
      })

      if (!tokenResponse.ok) {
        console.error('❌ DASHBOARD: Failed to get auth token for delete:', tokenResponse.status)
        toast.error('Authentication failed - please try again')
        return
      }

      const { token } = await tokenResponse.json()
      console.log('✅ DASHBOARD: Got auth token for delete')

      const response = await fetch(`/api/memories/${memoryToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('📡 DASHBOARD: Delete response status:', response.status)

      const data = await response.json()
      console.log('📡 DASHBOARD: Delete response data:', data)

      if (data.success) {
        console.log('🎉 DASHBOARD: Memory deleted successfully!')
        toast.success('Memory deleted successfully!')
        // Remove memory from state and clear from failed deletes if it was there
        setMemories(prevMemories => prevMemories.filter(m => m.id !== memoryToDelete.id))
        setFailedDeletes(prev => {
          const updated = new Set(prev)
          updated.delete(memoryToDelete.id)
          return updated
        })
        setShowDeleteModal(false)
        setMemoryToDelete(null)
      } else if (response.status === 404) {
        console.log('🔄 DASHBOARD: Memory not found in database - this might be a sync issue')
        
        // Track this failed delete
        setFailedDeletes(prev => new Set([...prev, memoryToDelete.id]))
        
        // Check if this memory was recently created (within last 5 minutes)
        const memoryAge = memoryToDelete.createdAt ? Date.now() - new Date(memoryToDelete.createdAt).getTime() : 0
        const isRecentlyCreated = memoryAge < 5 * 60 * 1000 // 5 minutes
        
        if (isRecentlyCreated) {
          console.log('⏰ DASHBOARD: Recently created memory - might be database sync delay')
          toast('Recently created memory removed from view - it may still be syncing', { 
            duration: 4000,
            icon: '⏰'
          })
        } else {
          console.log('🔄 DASHBOARD: Memory already deleted elsewhere - cleaning up frontend state')
          toast.success('Memory not found in database - removed from view')
        }
        
        // Always remove from frontend state since it's not in the database
        setMemories(prevMemories => {
          const filtered = prevMemories.filter(m => m.id !== memoryToDelete.id)
          console.log(`🧹 DASHBOARD: Removed memory from frontend - ${prevMemories.length} → ${filtered.length} memories`)
          return filtered
        })
        setShowDeleteModal(false)
        setMemoryToDelete(null)
        
        // Don't refresh immediately for recently created memories - let them settle
        if (!isRecentlyCreated) {
          console.log('🔄 DASHBOARD: Refreshing memories to sync with database')
          setTimeout(() => {
            fetchMemories()
          }, 500)
        } else {
          console.log('⏭️ DASHBOARD: Skipping immediate refresh for recently created memory')
        }
      } else {
        console.error('❌ DASHBOARD: Server returned error:', data.error)
        toast.error(data.error || 'Failed to delete memory')
      }
    } catch (error) {
      console.error('💥 DASHBOARD: Delete memory error:', error)
      toast.error('Failed to delete memory')
    } finally {
      setIsDeletingMemory(false)
    }
  }

  const cancelDeleteMemory = () => {
    setShowDeleteModal(false)
    setShowForceDeleteOption(false)
    setMemoryToDelete(null)
    setIsDeletingMemory(false)
  }

  const handleMemoryUpdated = (updatedMemory: MemoryWithRelations) => {
    // Update memory in state
    setMemories(prevMemories => 
      prevMemories.map(m => m.id === updatedMemory.id ? updatedMemory : m)
    )
  }

  const getViewName = () => {
    switch (activeTab) {
      case 'home': return 'Feed View'
      case 'timeline': return 'Timeline View'
      case 'timezones': return 'Life Chapters'
      default: return 'Feed View'
    }
  }

  const renderContent = () => {
    // Don't render timeline components until we have user data to avoid birth year timing issues
    if (isLoadingUser && !user) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="text-white text-2xl font-bold">L</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Loading your timeline...</h3>
            <p className="text-slate-600">Preparing your memories and chapters</p>
          </div>
        </div>
      )
    }

    // Remove forced view redirect - let new users choose their preferred view
    const effectiveActiveTab = activeTab

    switch (effectiveActiveTab) {
      case 'home':
        // Use the TimelineView for vertical feed with chapters on left axis
        const timelineBirthYear = user?.birthYear || new Date().getFullYear() - 25 // Better default than 1950
        console.log('🎯 DASHBOARD: Using vertical feed view with birth year:', {
          actual: user?.birthYear,
          fallback: new Date().getFullYear() - 25,
          used: timelineBirthYear,
          userLoaded: !!user
        })
        
        // Only render if we have user data
        if (!user) {
          return <div className="flex-1 flex items-center justify-center"><div>Loading...</div></div>
        }
        
        // Apply failed delete and permanent delete filtering to memories passed to TimelineView
        const filteredMemoriesForTimeline = memories.filter(memory => 
          !failedDeletes.has(memory.id) && !permanentlyDeleted.has(memory.id)
        )
        if (filteredMemoriesForTimeline.length !== memories.length) {
          const failedCount = memories.filter(m => failedDeletes.has(m.id)).length
          const permanentCount = memories.filter(m => permanentlyDeleted.has(m.id)).length
          console.log(`🔄 DASHBOARD: Passing ${filteredMemoriesForTimeline.length}/${memories.length} memories to TimelineView (filtered out ${failedCount} failed deletes, ${permanentCount} permanently deleted)`)
        }
        
        // Show the TimelineView as vertical feed with chapters on left axis
        return (
          <>
            <TimelineView 
              memories={filteredMemoriesForTimeline} 
              birthYear={timelineBirthYear}
              onEdit={handleEditMemory}
              onDelete={handleDeleteMemory}
              onStartCreating={handleCreateMemory}
            />
            
            {/* Debug Panel for Force Delete */}
            {(failedDeletes.size > 0 || permanentlyDeleted.size > 0) && (
              <div className="fixed bottom-4 right-4 bg-red-100 border border-red-300 rounded-lg p-4 shadow-lg max-w-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-red-800 font-medium text-sm">🚨 Stuck Memory Debug</h3>
                  <button 
                    onClick={() => setDebugMode(!debugMode)}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    {debugMode ? 'Hide' : 'Show'}
                  </button>
                </div>
                
                {debugMode && (
                  <div className="space-y-2">
                    <p className="text-red-700 text-xs">
                      {failedDeletes.size} memory(ies) failed to delete, {permanentlyDeleted.size} permanently removed
                    </p>
                    
                    <div className="space-y-1">
                      {Array.from(failedDeletes).map(memoryId => {
                        const memory = memories.find(m => m.id === memoryId)
                        return (
                          <div key={memoryId} className="bg-red-50 p-2 rounded text-xs">
                            <div className="font-medium text-red-800">
                              {memory?.title || 'Unknown'} ({memoryId.slice(0, 8)}...)
                            </div>
                            <button
                              onClick={() => {
                                console.log('💥 DEBUG: PERMANENTLY DELETING memory:', memoryId)
                                // Add to permanently deleted list
                                setPermanentlyDeleted(prev => new Set([...prev, memoryId]))
                                setFailedDeletes(prev => {
                                  const updated = new Set(prev)
                                  updated.delete(memoryId)
                                  return updated
                                })
                                setMemories(prev => prev.filter(m => m.id !== memoryId))
                                toast.success('Memory permanently removed from view')
                                console.log('🎯 DEBUG: Memory permanently deleted - will never reappear')
                              }}
                              className="mt-1 bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                            >
                              Force Remove
                            </button>
                          </div>
                        )
                      })}
                    </div>
                    
                    {permanentlyDeleted.size > 0 && (
                      <div className="space-y-1 border-t border-red-200 pt-2">
                        <p className="text-green-700 text-xs font-medium">✅ Permanently Removed:</p>
                        {Array.from(permanentlyDeleted).map(memoryId => {
                          const memory = memories.find(m => m.id === memoryId) // This might be null since it's filtered out
                          return (
                            <div key={memoryId} className="bg-green-50 p-2 rounded text-xs">
                              <div className="font-medium text-green-800">
                                {memory?.title || 'Deleted Memory'} ({memoryId.slice(0, 8)}...)
                              </div>
                              <div className="text-green-600 text-xs mt-1">
                                This memory will never reappear
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    
                    <button
                      onClick={() => {
                        console.log('🧹 DEBUG: Clearing all failed deletes and permanent deletes')
                        setFailedDeletes(new Set())
                        setPermanentlyDeleted(new Set())
                        toast.success('Cleared all stuck memory references')
                      }}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded text-xs font-medium"
                    >
                      Clear All Stuck References
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )
      case 'timeline': 
        const chronoBirthYear = user?.birthYear || new Date().getFullYear() - 25 // Better fallback
        console.log('🎯 DASHBOARD: Using chronological timeline for timeline tab:', {
          actual: user?.birthYear,
          userObject: user,
          fallback: new Date().getFullYear() - 25,
          used: chronoBirthYear,
          userLoaded: !!user,
          isNewUser: isNewUser
        })
        
        // Only render if we have user data
        if (!user) {
          return <div className="flex-1 flex items-center justify-center"><div>Loading...</div></div>
        }
        
        // Apply failed delete and permanent delete filtering to memories passed to ChronologicalTimelineView
        const filteredMemoriesForChrono = memories.filter(memory => 
          !failedDeletes.has(memory.id) && !permanentlyDeleted.has(memory.id)
        )
        if (filteredMemoriesForChrono.length !== memories.length) {
          const failedCount = memories.filter(m => failedDeletes.has(m.id)).length
          const permanentCount = memories.filter(m => permanentlyDeleted.has(m.id)).length
          console.log(`🔄 DASHBOARD: Passing ${filteredMemoriesForChrono.length}/${memories.length} memories to ChronologicalTimelineView (filtered out ${failedCount} failed deletes, ${permanentCount} permanently deleted)`)
        }
        
        // Keep the chronological timeline as the main timeline view
        return (
          <>
            <ChronologicalTimelineView 
              memories={filteredMemoriesForChrono} 
              birthYear={chronoBirthYear}
              onStartCreating={handleCreateMemory}
              onCreateChapter={() => setActiveTab('create-timezone')}
              onZoomChange={(zoomLevel, currentYear, formatLabel, handlers) => {
                setTimelineControls({
                  zoomLevel,
                  currentYear,
                  formatLabel,
                  handlers
                })
              }}
              isNewUser={isNewUser}
            />
            
            {/* Debug Panel for Force Delete */}
            {(failedDeletes.size > 0 || permanentlyDeleted.size > 0) && (
              <div className="fixed bottom-4 right-4 bg-red-100 border border-red-300 rounded-lg p-4 shadow-lg max-w-sm z-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-red-800 font-medium text-sm">🚨 Stuck Memory Debug</h3>
                  <button 
                    onClick={() => setDebugMode(!debugMode)}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    {debugMode ? 'Hide' : 'Show'}
                  </button>
                </div>
                
                {debugMode && (
                  <div className="space-y-2">
                    <p className="text-red-700 text-xs">
                      {failedDeletes.size} memory(ies) failed to delete, {permanentlyDeleted.size} permanently removed
                    </p>
                    
                    <div className="space-y-1">
                      {Array.from(failedDeletes).map(memoryId => {
                        const memory = memories.find(m => m.id === memoryId)
                        return (
                          <div key={memoryId} className="bg-red-50 p-2 rounded text-xs">
                            <div className="font-medium text-red-800">
                              {memory?.title || 'Unknown'} ({memoryId.slice(0, 8)}...)
                            </div>
                            <button
                              onClick={() => {
                                console.log('💥 DEBUG: PERMANENTLY DELETING memory:', memoryId)
                                // Add to permanently deleted list
                                setPermanentlyDeleted(prev => new Set([...prev, memoryId]))
                                setFailedDeletes(prev => {
                                  const updated = new Set(prev)
                                  updated.delete(memoryId)
                                  return updated
                                })
                                setMemories(prev => prev.filter(m => m.id !== memoryId))
                                toast.success('Memory permanently removed from view')
                                console.log('🎯 DEBUG: Memory permanently deleted - will never reappear')
                              }}
                              className="mt-1 bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                            >
                              Force Remove
                            </button>
                          </div>
                        )
                      })}
                    </div>
                    
                    {permanentlyDeleted.size > 0 && (
                      <div className="space-y-1 border-t border-red-200 pt-2">
                        <p className="text-green-700 text-xs font-medium">✅ Permanently Removed:</p>
                        {Array.from(permanentlyDeleted).map(memoryId => {
                          const memory = memories.find(m => m.id === memoryId) // This might be null since it's filtered out
                          return (
                            <div key={memoryId} className="bg-green-50 p-2 rounded text-xs">
                              <div className="font-medium text-green-800">
                                {memory?.title || 'Deleted Memory'} ({memoryId.slice(0, 8)}...)
                              </div>
                              <div className="text-green-600 text-xs mt-1">
                                This memory will never reappear
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    
                    <button
                      onClick={() => {
                        console.log('🧹 DEBUG: Clearing all failed deletes and permanent deletes')
                        setFailedDeletes(new Set())
                        setPermanentlyDeleted(new Set())
                        toast.success('Cleared all stuck memory references')
                      }}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded text-xs font-medium"
                    >
                      Clear All Stuck References
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )
      case 'profile':
        return <UserProfile onLogout={handleLogout} />
      case 'create':
        return <CreateMemory onMemoryCreated={handleMemoryCreated} />
      case 'timezones':
        return <GroupManager onCreateGroup={() => setActiveTab('create-timezone')} onStartCreating={handleCreateMemory} />
      case 'create-timezone':
        return <CreateTimeZone onSuccess={() => { setActiveTab('timezones'); fetchMemories(); }} onCancel={() => setActiveTab('timezones')} />
      default:
        return <div className="flex items-center justify-center h-full"><p>Select a view from the navigation</p></div>
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Clean Top Navigation */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/50 px-4 lg:px-8 py-4 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-600 to-sky-500 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
                This is Me
              </h1>
              <p className="text-xs text-slate-500 font-medium hidden lg:block">
                {activeTab === 'timeline' ?
                  `Interactive timeline • ${memories.length} memories` :
                  'Your Memory Feed'
                }
              </p>
            </div>
          </div>

          {/* Center - View Switcher & Timeline Controls */}
          <div className="flex items-center space-x-4">
            {/* View Switcher Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowViewDropdown(!showViewDropdown)}
                className="flex items-center space-x-2 bg-white hover:bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 transition-colors"
              >
                <span className="text-sm font-medium text-slate-700">{getViewName()}</span>
                <ChevronDown size={16} className="text-slate-400" />
              </button>
              
              {showViewDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10 min-w-[150px]">
                  <button
                    onClick={() => { setActiveTab('home'); setShowViewDropdown(false) }}
                    className={`w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors ${activeTab === 'home' ? 'text-slate-900 font-medium' : 'text-slate-600'}`}
                  >
                    🏠 Feed View
                  </button>
                  <button
                    onClick={() => { setActiveTab('timeline'); setShowViewDropdown(false) }}
                    className={`w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors ${activeTab === 'timeline' ? 'text-slate-900 font-medium' : 'text-slate-600'}`}
                  >
                    📊 Timeline View
                  </button>
                  <button
                    onClick={() => { setActiveTab('timezones'); setShowViewDropdown(false) }}
                    className={`w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors ${activeTab === 'timezones' ? 'text-slate-900 font-medium' : 'text-slate-600'}`}
                  >
                    📖 Chapter View
                  </button>
                </div>
              )}
            </div>

            {/* Timeline Controls - only show when timeline is active */}
            {timelineControls && (
              <div className="flex items-center space-x-3">
                <div className="hidden lg:block text-sm text-slate-600 font-medium">
                  {timelineControls.formatLabel()}
                </div>
                
                <div className="flex items-center bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={timelineControls.handlers.navigatePrev}
                    className="p-2 hover:bg-white rounded-md transition-colors text-slate-600 hover:text-slate-800"
                    title="Previous"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  <button
                    onClick={timelineControls.handlers.zoomOut}
                    disabled={!timelineControls.handlers.canZoomOut}
                    className="p-2 hover:bg-white rounded-md transition-colors text-slate-600 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Zoom Out"
                  >
                    <ZoomOut size={16} />
                  </button>
                  
                  <button
                    onClick={timelineControls.handlers.zoomIn}
                    disabled={!timelineControls.handlers.canZoomIn}
                    className="p-2 hover:bg-white rounded-md transition-colors text-slate-600 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Zoom In"
                  >
                    <ZoomIn size={16} />
                  </button>
                  
                  <button
                    onClick={timelineControls.handlers.navigateNext}
                    className="p-2 hover:bg-white rounded-md transition-colors text-slate-600 hover:text-slate-800"
                    title="Next"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right - Actions & Profile */}
          <div className="flex items-center space-x-3">
            {/* Add Chapter Button - Available for all users */}
            <button
              onClick={() => setActiveTab('create-timezone')}
              className="bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-700 hover:to-slate-600 text-white px-4 py-2 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
            >
              <Plus size={18} />
              <span className="hidden lg:inline">Add Chapter</span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-all duration-200"
              >
                <User size={20} className="text-slate-600" />
              </button>
              
              {showProfileDropdown && (
                <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 py-2 min-w-[180px] z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-900">
                      {user?.email || 'Loading...'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {user?.birthYear ? `Born ${user.birthYear}` : 'Birth year not set'}
                    </p>
                  </div>
                  <button
                    onClick={() => { setActiveTab('profile'); setShowProfileDropdown(false) }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors text-slate-600"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 hover:bg-red-50 transition-colors text-red-600"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {renderContent()}
      </main>

      {/* Memory Wizard Overlay */}
      {showMemoryWizard && (
        <AddMemoryWizard
          chapterId={selectedChapterId}
          chapterTitle={selectedChapterTitle}
          onComplete={handleMemoryCreated}
          onCancel={() => setShowMemoryWizard(false)}
        />
      )}

      {/* Click outside handlers */}
      {(showProfileDropdown || showViewDropdown) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowProfileDropdown(false)
            setShowViewDropdown(false)
          }}
        />
      )}

      {/* Edit Memory Modal */}
      <EditMemoryModal
        memory={editingMemory}
        isOpen={showEditMemoryModal}
        onClose={() => {
          setShowEditMemoryModal(false)
          setEditingMemory(null)
        }}
        onSave={handleMemoryUpdated}
        onDelete={handleDeleteMemory}
      />

      {/* Delete Confirmation Modal */}
              <DeleteConfirmationModal
          isOpen={showDeleteModal}
          title="Delete Memory"
          message="Are you sure you want to delete this memory?"
          itemName={memoryToDelete?.title || 'Untitled Memory'}
          itemType="memory"
          onConfirm={confirmDeleteMemory}
          onCancel={cancelDeleteMemory}
          isLoading={isDeletingMemory}
          showForceDelete={showForceDeleteOption}
          onForceDelete={forceDeleteMemory}
        />
    </div>
  )
} 