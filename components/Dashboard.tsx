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
import { useAuth } from '@/components/AuthProvider'

type TabType = 'home' | 'timeline' | 'create' | 'timezones' | 'create-timezone' | 'profile'

interface UserType {
  id: string
  email: string
  birthYear?: number
}

export default function Dashboard() {
  const { user: supabaseUser } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [memories, setMemories] = useState([])
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
        setMemories(data.data || [])  // Fixed: API returns data.data, not data.memories
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
      fetchUserAndMemories()
    }
    toast.success('Memory created successfully!')
  }

  const getViewName = () => {
    switch (activeTab) {
      case 'home': return 'Timeline View'
      case 'timeline': return 'Horizontal View'
      case 'timezones': return 'Life Chapters'
      default: return 'Timeline View'
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

    // For new users, default to horizontal timeline view
    const effectiveActiveTab = isNewUser && activeTab === 'home' ? 'timeline' : activeTab

    switch (effectiveActiveTab) {
      case 'home':
        // Use the proper TimelineView with vertical timeline and chapters on left axis
        const timelineBirthYear = user?.birthYear || new Date().getFullYear() - 25 // Better default than 1950
        console.log('🎯 DASHBOARD: Using proper TimelineView with birth year:', {
          actual: user?.birthYear,
          fallback: new Date().getFullYear() - 25,
          used: timelineBirthYear,
          userLoaded: !!user
        })
        
        // Only render if we have user data
        if (!user) {
          return <div className="flex-1 flex items-center justify-center"><div>Loading...</div></div>
        }
        
        // Show the TimelineView with vertical timeline and chapters on left axis
        return <TimelineView 
          memories={memories} 
          birthYear={timelineBirthYear}
          onEdit={(memory) => console.log('Edit memory:', memory)}
          onDelete={(memory) => console.log('Delete memory:', memory)}
          onStartCreating={handleCreateMemory}
        />
      case 'timeline': 
        const chronoBirthYear = user?.birthYear || new Date().getFullYear() - 25 // Better fallback
        console.log('🎯 DASHBOARD: Using horizontal timeline for timeline tab:', {
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
        
        // Keep the horizontal timeline as an alternative view
        return <ChronologicalTimelineView 
          memories={memories} 
          birthYear={chronoBirthYear}
          onStartCreating={handleCreateMemory}
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
      case 'profile':
        return <UserProfile onLogout={handleLogout} />
      case 'create':
        return <CreateMemory onMemoryCreated={handleMemoryCreated} />
      case 'timezones':
        return <GroupManager onCreateGroup={() => setActiveTab('create-timezone')} />
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
            <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">
                LIFE
              </h1>
              <p className="text-xs text-slate-500 font-medium hidden lg:block">
                {activeTab === 'timeline' ? 
                  `Interactive timeline • ${memories.length} memories` : 
                  'Your Timeline'
                }
              </p>
            </div>
          </div>

          {/* Center - View Switcher & Timeline Controls */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setShowViewDropdown(!showViewDropdown)}
                className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-all duration-200"
              >
                <span className="font-medium text-slate-700">{getViewName()}</span>
                <ChevronDown size={16} className="text-slate-500" />
              </button>
              
              {showViewDropdown && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 py-2 min-w-[200px] z-50">
                  <button
                    onClick={() => { setActiveTab('home'); setShowViewDropdown(false) }}
                    className={`w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors ${activeTab === 'home' ? 'text-slate-900 font-medium' : 'text-slate-600'}`}
                  >
                    🏠 Timeline View
                  </button>
                  <button
                    onClick={() => { setActiveTab('timeline'); setShowViewDropdown(false) }}
                    className={`w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors ${activeTab === 'timeline' ? 'text-slate-900 font-medium' : 'text-slate-600'}`}
                  >
                    📊 Horizontal View
                  </button>
                  <button
                    onClick={() => { setActiveTab('timezones'); setShowViewDropdown(false) }}
                    className={`w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors ${activeTab === 'timezones' ? 'text-slate-900 font-medium' : 'text-slate-600'}`}
                  >
                    📖 Life Chapters
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
            {/* Add Chapter Button - Hidden for new users to avoid confusion with welcome experience */}
            {!isNewUser && (
              <button
                onClick={() => setActiveTab('create-timezone')}
                className="bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-700 hover:to-slate-600 text-white px-4 py-2 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
              >
                <Plus size={18} />
                <span className="hidden lg:inline">Add Chapter</span>
              </button>
            )}
            
            {/* Add Memory Button */}
            <button
              onClick={() => handleCreateMemory()}
              className="bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-900 hover:to-slate-800 text-white px-4 py-2 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
            >
              <Plus size={18} />
              <span className="hidden lg:inline">Add Memory</span>
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
    </div>
  )
} 