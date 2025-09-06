'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Calendar, Clock, Users, Lock, ChevronDown, ChevronUp, Plus, Camera, Heart, MessageCircle, Share, MapPin, Edit, Info } from 'lucide-react'
import { MemoryWithRelations, TimeZoneWithRelations } from '@/lib/types'
import { formatDate, formatRelativeTime } from './utils'
import { useAuth } from './AuthProvider'
import EditChapterModal from './EditChapterModal'
import PhotoTagDisplay from './PhotoTagDisplay'

interface TimelineViewProps {
  memories: MemoryWithRelations[]
  birthYear?: number
  user?: { id: string; email: string; birthYear?: number } | null
  onEdit?: (memory: MemoryWithRelations) => void
  onDelete?: (memory: MemoryWithRelations) => void
  onStartCreating?: (chapterId?: string, chapterTitle?: string) => void
  onCreateChapter?: () => void
  onChapterSelected?: (chapterId: string, chapterTitle: string) => void
  highlightedMemories?: Set<string>
  voiceAddedMemories?: Set<string>
  highlightedChapters?: Set<string>
  onNavigateToMyPeople?: (personId?: string) => void
}

interface TimelineGroup {
  dayKey: string
  date: Date
  formattedDate: string
  memories: MemoryWithRelations[]
}

export default function TimelineView({ 
  memories, 
  birthYear, 
  user: propUser, 
  onEdit, 
  onDelete, 
  onStartCreating,
  onCreateChapter,
  onChapterSelected,
  highlightedMemories = new Set(),
  voiceAddedMemories = new Set(),
  highlightedChapters = new Set(),
  onNavigateToMyPeople
}: TimelineViewProps) {
  const { user: authUser } = useAuth()
  const user = propUser || authUser
  const [chapters, setChapters] = useState<TimeZoneWithRelations[]>([])
  const [isLoadingChapters, setIsLoadingChapters] = useState(true)
  const [likedMemories, setLikedMemories] = useState<Set<string>>(new Set())
  const [memoryLikeCounts, setMemoryLikeCounts] = useState<Record<string, number>>({})
  const [expandedMemory, setExpandedMemory] = useState<string | null>(null)
  
  // Edit chapter modal state
  const [editingChapter, setEditingChapter] = useState<TimeZoneWithRelations | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  // Memory interaction handlers
  const handleLikeMemory = (memoryId: string) => {
    const isLiked = likedMemories.has(memoryId)
    const newLikedMemories = new Set(likedMemories)
    const currentCount = memoryLikeCounts[memoryId] || 0
    
    if (isLiked) {
      newLikedMemories.delete(memoryId)
      setMemoryLikeCounts(prev => ({
        ...prev,
        [memoryId]: Math.max(0, currentCount - 1)
      }))
    } else {
      newLikedMemories.add(memoryId)
      setMemoryLikeCounts(prev => ({
        ...prev,
        [memoryId]: currentCount + 1
      }))
    }
    
    setLikedMemories(newLikedMemories)
  }

  const handleCommentMemory = (memoryId: string) => {
    // For now, just show an alert - this would open a comment modal in a full implementation
    alert(`Comments feature coming soon! Memory ID: ${memoryId}`)
  }

  const handleShareMemory = (memory: MemoryWithRelations) => {
    if (navigator.share) {
      navigator.share({
        title: memory.title || 'Memory from This is Me',
        text: memory.textContent || 'Check out this memory!',
        url: window.location.origin
      }).catch(console.error)
    } else {
      // Fallback for browsers without native sharing
      navigator.clipboard.writeText(
        `${memory.title || 'Memory'}: ${memory.textContent || 'A memory from This is Me'} - ${window.location.origin}`
      ).then(() => {
        alert('Memory details copied to clipboard!')
      }).catch(() => {
        alert('Unable to share this memory')
      })
    }
  }

  // Add filter state
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [showChapterSidebar, setShowChapterSidebar] = useState(true)

  // Exposed function to programmatically select a chapter
  const selectChapterByName = useCallback((chapterName: string) => {
    console.log('🎯 TIMELINE: Looking for chapter to select:', chapterName)
    const chapter = chapters.find(c => 
      c.title?.toLowerCase() === chapterName.toLowerCase() ||
      c.title?.toLowerCase().includes(chapterName.toLowerCase()) ||
      chapterName.toLowerCase().includes(c.title?.toLowerCase() || '')
    )
    
    if (chapter) {
      console.log('🎯 TIMELINE: Found and selecting chapter:', chapter.title, chapter.id)
      setSelectedChapterId(chapter.id)
      onChapterSelected?.(chapter.id, chapter.title || '')
      
      // Scroll to the chapter button in sidebar
      setTimeout(() => {
        const chapterButton = document.querySelector(`[data-chapter-name="${chapter.title}"]`)
        if (chapterButton) {
          chapterButton.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 100)
      
      return true
    } else {
      console.log('🎯 TIMELINE: Chapter not found:', chapterName, 'Available:', chapters.map(c => c.title))
      return false
    }
  }, [chapters, onChapterSelected])

  // Expose selectChapterByName via ref or custom hook if needed
  useEffect(() => {
    if (window) {
      (window as any).selectChapterByName = selectChapterByName
    }
  }, [selectChapterByName])

  // Filter memories based on selected chapter
  const filteredMemories = selectedChapterId 
    ? memories.filter(memory => memory.timeZoneId === selectedChapterId)
    : memories

  // Update timeline groups to use filtered memories
  const timelineGroups: TimelineGroup[] = filteredMemories
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .reduce((groups: TimelineGroup[], memory) => {
      const date = new Date(memory.createdAt || memory.updatedAt)
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      
      const existingGroup = groups.find(g => g.dayKey === dayKey)
      if (existingGroup) {
        existingGroup.memories.push(memory)
      } else {
        groups.push({
          dayKey,
          date,
          formattedDate: date.toLocaleDateString('en-GB', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          memories: [memory]
        })
      }
      return groups
    }, [])

  const timelineRef = useRef<HTMLDivElement>(null)

  const currentYear = new Date().getFullYear()

  // Fetch chapters on component mount
  useEffect(() => {
    if (user) {
      fetchChapters()
    }
  }, [user])

  // Refetch chapters when memories change
  useEffect(() => {
    if (user) {
      console.log('🔄 TIMELINE VIEW: Refreshing chapters after memory change')
      fetchChapters()
    }
  }, [memories.length, user])

  // Debug logging
  useEffect(() => {
    console.log('🌟 TIMELINE VIEW: Data update -', memories.length, 'memories and', chapters.length, 'chapters')
    console.log('📊 TIMELINE VIEW MEMORIES:', memories.map(m => ({ 
      id: m.id, 
      title: m.title, 
      timeZoneId: m.timeZoneId 
    })))
    console.log('📁 TIMELINE VIEW CHAPTERS:', chapters.map(c => ({ 
      id: c.id, 
      title: c.title 
    })))
  }, [memories, chapters])

  const fetchChapters = async () => {
    try {
      if (!user) {
        console.log('❌ TIMELINE VIEW: No user, skipping chapter fetch')
        setIsLoadingChapters(false)
        return
      }

      console.log('🔑 TIMELINE VIEW: Getting auth token for user:', user.id)

      // Get custom JWT token for API
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      if (!tokenResponse.ok) {
        console.error('❌ TIMELINE VIEW: Failed to get auth token:', tokenResponse.status)
        setIsLoadingChapters(false)
        return
      }

      const { token } = await tokenResponse.json()
      console.log('✅ TIMELINE VIEW: Got auth token')

      console.log('📡 TIMELINE VIEW: Calling /api/timezones')
      const response = await fetch('/api/timezones', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('📡 TIMELINE VIEW: Response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ TIMELINE VIEW: Chapters fetched:', data.timeZones?.length || 0)
        setChapters(data.timeZones || [])
      } else {
        console.error('❌ TIMELINE VIEW: Failed to fetch chapters:', response.status)
      }
    } catch (error) {
      console.error('❌ TIMELINE VIEW: Error fetching chapters:', error)
    } finally {
      setIsLoadingChapters(false)
    }
  }

  const handleMemoryClick = (memoryId: string) => {
    setExpandedMemory(expandedMemory === memoryId ? null : memoryId)
  }

  const getChapterMemories = (chapterId: string) => {
    return memories.filter(memory => memory.timeZoneId === chapterId)
  }

  const selectedChapter = chapters.find(c => c.id === selectedChapterId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header with Add Memory Button */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Your Memory Feed</h1>
            <p className="text-slate-600 text-sm mt-1">
              {filteredMemories.length} {filteredMemories.length === 1 ? 'memory' : 'memories'} 
              {selectedChapterId && selectedChapter ? ` in ${selectedChapter.title}` : ' across all chapters'}
            </p>
          </div>
          <button
            onClick={() => onStartCreating?.()}
            className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 min-w-[140px]"
          >
            <Plus size={16} />
            <span>Add Memory</span>
          </button>
        </div>

        {/* Mobile Chapter Filter Bar */}
        <div className="lg:hidden mb-6">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Filter by Chapter</h3>
              <button
                onClick={() => setShowChapterSidebar(!showChapterSidebar)}
                className="text-slate-500 hover:text-slate-700"
              >
                {showChapterSidebar ? 'Hide' : 'Show'}
              </button>
            </div>
            
            {showChapterSidebar && (
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedChapterId(null)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 ${
                    selectedChapterId === null
                      ? 'bg-sky-50 border-sky-200 text-sky-900 font-medium'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>All Memories</span>
                    <span className="text-sm opacity-75">{memories.length}</span>
                  </div>
                </button>
                {chapters.map((chapter) => {
                  const chapterMemories = getChapterMemories(chapter.id)
                  return (
                    <button
                      key={chapter.id}
                      onClick={() => setSelectedChapterId(chapter.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 ${
                        selectedChapterId === chapter.id
                          ? 'bg-sky-50 border-sky-200 text-sky-900 font-medium'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{chapter.title}</span>
                        <span className="text-sm opacity-75">{chapterMemories.length}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Desktop Left Sidebar - Chapter Filters */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 sticky top-40 max-h-[calc(100vh-12rem)] flex flex-col">
              <div className="p-6 border-b border-slate-100 flex-shrink-0">
                <h2 className="text-xl font-bold text-slate-900">Filter by Chapter</h2>
                <p className="text-sm text-slate-600 mt-1">
                  {selectedChapterId ? `${filteredMemories.length} filtered memories` : `${memories.length} total memories`}
                </p>
              </div>

              <div className="p-4 space-y-3 overflow-y-auto flex-1 min-h-0">
                {/* All Memories Filter */}
                <button
                  onClick={() => setSelectedChapterId(null)}
                  className={`w-full text-left px-4 py-4 rounded-xl border transition-all duration-200 ${
                    selectedChapterId === null
                      ? 'bg-sky-50 border-sky-200 text-sky-900 shadow-sm ring-1 ring-sky-200'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">All Memories</span>
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      selectedChapterId === null 
                        ? 'bg-sky-100 text-sky-700' 
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {memories.length}
                    </span>
                  </div>
                  <p className="text-xs mt-1 opacity-75">Show all memories from every chapter</p>
                </button>

                {isLoadingChapters ? (
                  <div className="text-center py-8 text-slate-500">
                    Loading chapters...
                  </div>
                ) : chapters.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-slate-500 mb-4">No chapters yet</div>
                    <p className="text-sm text-slate-400 mb-4">
                      Create your first life chapter to organise your memories by time periods
                    </p>
                    <p className="text-xs text-slate-500">
                      Use the "Add Chapter" button in the top navigation to create your first chapter.
                    </p>
                  </div>
                ) : (
                  chapters
                    .sort((a, b) => {
                      // Primary sort by start date
                      const aDate = a.startDate ? new Date(a.startDate).getTime() : Number.MAX_SAFE_INTEGER;
                      const bDate = b.startDate ? new Date(b.startDate).getTime() : Number.MAX_SAFE_INTEGER;
                      if (aDate !== bDate) return aDate - bDate;
                      
                      // Secondary sort by end date if available
                      const aEndDate = a.endDate ? new Date(a.endDate).getTime() : Number.MAX_SAFE_INTEGER;
                      const bEndDate = b.endDate ? new Date(b.endDate).getTime() : Number.MAX_SAFE_INTEGER;
                      if (aEndDate !== bEndDate) return aEndDate - bEndDate;
                      
                      // Final sort by title alphabetically
                      return (a.title || '').localeCompare(b.title || '')
                    })
                    .map((chapter) => {
                      const chapterMemories = getChapterMemories(chapter.id)
                      const startYear = chapter.startDate ? new Date(chapter.startDate).getFullYear() : null
                      const endYear = chapter.endDate ? new Date(chapter.endDate).getFullYear() : null
                      const isSelected = selectedChapterId === chapter.id
                      const isHighlighted = highlightedChapters.has(chapter.title || '')
                      
                      return (
                        <button
                          key={chapter.id}
                          onClick={() => setSelectedChapterId(chapter.id)}
                          data-chapter-name={chapter.title}
                          className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                            isSelected
                              ? 'bg-sky-50 border-sky-200 text-sky-900 shadow-sm ring-1 ring-sky-200'
                              : isHighlighted
                              ? 'bg-green-50 border-green-300 text-green-900 shadow-md ring-2 ring-green-200 animate-pulse'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 hover:shadow-sm'
                          }`}
                        >
                          {/* Chapter Header Image */}
                          {chapter.headerImageUrl && (
                            <div className="relative h-32 bg-slate-100 rounded-lg mb-3 overflow-hidden">
                              <img 
                                src={chapter.headerImageUrl} 
                                alt={chapter.title}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/10"></div>
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <h4 className="font-semibold text-sm leading-tight">{chapter.title}</h4>
                              <span className={`text-xs px-2 py-1 rounded-full ml-2 ${
                                isSelected 
                                  ? 'bg-sky-100 text-sky-700' 
                                  : 'bg-slate-200 text-slate-600'
                              }`}>
                                {chapterMemories.length}
                              </span>
                            </div>
                            
                            {(startYear || endYear) && (
                              <div className="flex items-center space-x-1 opacity-75">
                                <Calendar size={10} />
                                <span className="text-xs">
                                  {startYear && endYear ? `${startYear} - ${endYear}` : 
                                   startYear ? `From ${startYear}` : 
                                   endYear ? `Until ${endYear}` : ''}
                                </span>
                              </div>
                            )}

                            {chapter.description && (
                              <p className="text-xs opacity-75 line-clamp-2">{chapter.description}</p>
                            )}
                          </div>

                          {/* Edit/Info buttons - only show on hover */}
                          <div className="flex items-center justify-end space-x-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Info Icon with Hover Details */}
                            <div className="relative group">
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="w-6 h-6 bg-white/80 hover:bg-white rounded-md flex items-center justify-center transition-colors"
                                title="Chapter Details"
                              >
                                <Info size={12} className="text-slate-600" />
                              </button>
                              
                              {/* Hover Tooltip */}
                              <div className="absolute right-0 bottom-full mb-2 w-80 bg-white rounded-lg shadow-2xl border border-slate-200 p-4 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[99999]" style={{ zIndex: 99999 }}>
                                <div className="space-y-3">
                                  <div className="border-b border-slate-100 pb-2">
                                    <h4 className="font-semibold text-slate-900 text-sm">{chapter.title}</h4>
                                    <p className="text-xs text-slate-500">
                                      {startYear} - {endYear === currentYear ? 'Present' : endYear}
                                    </p>
                                  </div>
                                  
                                  {chapter.description && (
                                    <div>
                                      <p className="text-xs font-medium text-slate-700 mb-1">Description:</p>
                                      <p className="text-xs text-slate-600 leading-relaxed">{chapter.description}</p>
                                    </div>
                                  )}
                                  
                                  {chapter.location && (
                                    <div>
                                      <p className="text-xs font-medium text-slate-700 mb-1">Location:</p>
                                      <p className="text-xs text-slate-600">{chapter.location}</p>
                                    </div>
                                  )}
                                  
                                  <div className="pt-2 border-t border-slate-100">
                                    <p className="text-xs text-slate-500">
                                      {chapterMemories.length} {chapterMemories.length === 1 ? 'memory' : 'memories'} in this chapter
                                    </p>
                                  </div>
                                </div>
                                
                                {/* Arrow pointing up to button */}
                                <div className="absolute -bottom-1 right-6 w-2 h-2 bg-white border-l border-b border-slate-200 transform rotate-45"></div>
                              </div>
                            </div>
                            
                            {/* Edit Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingChapter(chapter)
                                setShowEditModal(true)
                              }}
                              className="w-6 h-6 bg-white/80 hover:bg-white rounded-md flex items-center justify-center transition-colors"
                              title="Edit Chapter joa"
                            >
                              <Edit size={12} className="text-slate-600" />
                            </button>
                          </div>
                        </button>
                      )
                    })
                )}
              </div>
            </div>
          </div>

          {/* Main Content - Memory Feed */}
          <div className="lg:col-span-3">
            {/* Active Filter Indicator */}
            {selectedChapterId && selectedChapter && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      Filtering by: <span className="font-bold">{selectedChapter.title}</span>
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Showing {filteredMemories.length} of {memories.length} memories
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setSelectedChapterId(null)}
                      className="text-sky-600 hover:text-sky-800 text-sm font-medium"
                    >
                      Clear Filter
                    </button>
                  </div>
                </div>
              </div>
            )}

            {filteredMemories.length === 0 ? (
              selectedChapterId ? (
                // No memories in selected chapter
                <div className="text-center py-12">
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">No memories in this chapter yet</h3>
                  <p className="text-slate-600 mb-6">
                    Start adding photos, videos, and stories to the "{selectedChapter?.title}" chapter.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={() => onStartCreating?.(selectedChapterId, selectedChapter?.title)}
                      className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center space-x-2"
                    >
                      <span className="text-lg">+</span>
                      <span>Add Memory to "{selectedChapter?.title}"</span>
                    </button>
                    <button
                      onClick={() => setSelectedChapterId(null)}
                      className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                    >
                      View All Memories
                    </button>
                  </div>
                </div>
              ) : chapters.length === 0 ? (
                // Empty state for when user has no chapters at all
                <div className="text-center py-12 max-w-2xl mx-auto">
                  <div className="w-20 h-20 bg-sky-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <span className="text-sky-600 text-3xl">📖</span>
                  </div>
                  <h3 className="text-3xl font-bold text-slate-900 mb-4">Let's Create Your First Chapter</h3>
                  <p className="text-slate-600 mb-8 text-lg leading-relaxed">
                    Think of chapters as different periods or phases of your life. They help organize your memories chronologically and make your story easier to explore.
                  </p>
                  
                  <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-2xl p-6 mb-8 border border-sky-100">
                    <h4 className="font-semibold text-sky-900 mb-4">💡 Chapter inspiration:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">🏫</span>
                        <span className="text-sky-800">School or university years</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">🏢</span>
                        <span className="text-sky-800">Your first job or career</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">🏠</span>
                        <span className="text-sky-800">Living in a particular city</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">❤️</span>
                        <span className="text-sky-800">A relationship or marriage</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">✈️</span>
                        <span className="text-sky-800">Travel adventures</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">👶</span>
                        <span className="text-sky-800">Childhood or teen years</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                      onClick={() => onCreateChapter?.()}
                      className="bg-sky-600 hover:bg-sky-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-colors flex items-center space-x-3 shadow-lg hover:shadow-xl"
                    >
                      <span className="text-xl">📖</span>
                      <span>Create Your First Chapter</span>
                    </button>
                    <button
                      onClick={() => onStartCreating?.()}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-medium transition-colors flex items-center space-x-2"
                    >
                      <span>💭</span>
                      <span>Add Memory Without Chapter</span>
                    </button>
                  </div>
                  
                  <div className="mt-6 text-sm text-slate-500">
                    <p>💡 <strong>Tip:</strong> You can always add memories to chapters later, but starting with chapters makes your timeline more organized!</p>
                  </div>
                </div>
              ) : (
                // Empty state for when we have chapters but no memories
                <div className="text-center py-12">
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">Your Chapters Are Ready!</h3>
                  <p className="text-slate-600 mb-6">
                    You have {chapters.length} chapter{chapters.length !== 1 ? 's' : ''} set up. Now let's fill them with your precious memories!
                  </p>
                  <div className="bg-slate-50 rounded-xl p-6 mb-6">
                    <h4 className="font-semibold text-slate-800 mb-3">💡 Start adding memories:</h4>
                    <div className="text-left space-y-2">
                      <p>• 📸 Click on a chapter to add photos and videos</p>
                      <p>• ✍️ Share stories and descriptions of your experiences</p>
                      <p>• 🎤 Use voice chat with Maya for hands-free memory creation</p>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-8" ref={timelineRef}>
                {timelineGroups.map((group, groupIndex) => (
                  <div key={group.dayKey}>
                    {/* Date Header */}
                    <div className="flex items-center mb-6">
                      <div className="flex-1 h-px bg-slate-200"></div>
                      <div className="px-4 py-2 bg-slate-100 rounded-full">
                        <span className="text-sm font-medium text-slate-700">{group.formattedDate}</span>
                      </div>
                      <div className="flex-1 h-px bg-slate-200"></div>
                    </div>

                    {/* Memories */}
                    <div className="space-y-6">
                      {group.memories.map((memory) => {
                        const isHighlighted = highlightedMemories.has(memory.id)
                        const isVoiceAdded = voiceAddedMemories.has(memory.id)
                        
                        return (
                        <article 
                          key={memory.id} 
                          data-memory-id={memory.id}
                          className={`bg-white rounded-2xl shadow-lg border overflow-hidden hover:shadow-xl transition-all duration-300 relative ${
                            isHighlighted 
                              ? 'border-green-400 shadow-green-100 ring-2 ring-green-200 animate-pulse' 
                              : 'border-slate-200/50'
                          }`}
                        >
                          {/* Voice Memory Badge */}
                          {isVoiceAdded && (
                            <div className="absolute top-3 right-3 z-10">
                              <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-lg">
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                Voice Added
                              </div>
                            </div>
                          )}
                          
                          {/* Highlight Glow Effect */}
                          {isHighlighted && (
                            <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 to-emerald-400/10 pointer-events-none rounded-2xl"></div>
                          )}
                          {/* Memory Header */}
                          <div className="p-4 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-sm font-bold">
                                    {memory.title ? memory.title.charAt(0).toUpperCase() : 'M'}
                                  </span>
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <h3 className="font-semibold text-slate-900">
                                      {memory.title || 'Memory'}
                                    </h3>
                                    {memory.timeZone && (
                                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full flex items-center space-x-1">
                                        {memory.timeZone.type === 'PRIVATE' ? (
                                          <Lock size={10} />
                                        ) : (
                                          <Users size={10} />
                                        )}
                                        <span>{memory.timeZone.title}</span>
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500">
                                    {formatRelativeTime(memory.createdAt)} • {formatDate(memory.createdAt)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1 text-slate-400">
                                <Clock size={14} />
                              </div>
                            </div>
                          </div>

                          {/* Memory Content */}
                          <div className="p-4">
                            {/* Text Content */}
                            {memory.textContent && (
                              <p className="text-slate-700 leading-relaxed mb-4 whitespace-pre-wrap">
                                {memory.textContent}
                              </p>
                            )}

                            {/* Media Content */}
                            {memory.media && memory.media.length > 0 && (
                              <div className="space-y-4">
                                {memory.media.map((media) => (
                                  <div key={media.id} className="rounded-xl overflow-hidden">
                                    {media.type === 'IMAGE' && (
                                      <>
                        <PhotoTagDisplay
                          mediaId={media.id}
                          imageUrl={media.storage_url}
                          className="w-full max-w-[480px] h-auto mx-auto object-contain cursor-pointer hover:scale-105 transition-transform duration-300"
                          showTagsOnHover={true}
                          showTagIndicator={true}
                          onPersonClick={(personId, personName) => {
                            console.log('🏷️ TIMELINE: Person clicked:', personName, personId)
                            if (onNavigateToMyPeople) {
                              onNavigateToMyPeople(personId)
                            }
                          }}
                          onTagNowClick={(mediaId) => {
                            console.log('🏷️ TIMELINE: Tag now clicked for media:', mediaId)
                            // Find the memory that contains this media and open edit modal
                            const memoryWithMedia = memories.find(mem => 
                              mem.media && mem.media.some(m => m.id === mediaId)
                            )
                            if (memoryWithMedia && onEdit) {
                              console.log('🏷️ TIMELINE: Opening edit modal for memory:', memoryWithMedia.id)
                              onEdit(memoryWithMedia)
                            }
                          }}
                        />
                                      </>
                                    )}
                                    {media.type === 'VIDEO' && (
                                      <video 
                                        src={media.storage_url} 
                                        controls 
                                        className="w-full max-w-[480px] max-h-96 mx-auto rounded-xl"
                                        poster={media.thumbnail_url || undefined}
                                      />
                                    )}
                                    {media.type === 'AUDIO' && (
                                      <div className="bg-slate-50 p-4 rounded-xl">
                                        <div className="flex items-center space-x-3 mb-3">
                                          <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
                                            <span className="text-white text-lg">🎵</span>
                                          </div>
                                          <div>
                                            <p className="font-medium text-slate-900">
                                              {media.file_name || 'Audio Recording'}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                              {(media.file_size / 1024 / 1024).toFixed(1)} MB
                                            </p>
                                          </div>
                                        </div>
                                        <audio 
                                          src={media.storage_url} 
                                          controls 
                                          className="w-full"
                                        />
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {memory.media.length > 1 && (
                                  <p className="text-xs text-slate-500 text-center">
                                    {memory.media.length} files attached
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Memory Actions */}
                          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <button 
                                  onClick={() => handleLikeMemory(memory.id)}
                                  className={`flex items-center space-x-1 transition-colors ${
                                    likedMemories.has(memory.id) 
                                      ? 'text-red-500 hover:text-red-600' 
                                      : 'text-slate-500 hover:text-slate-700'
                                  }`}
                                >
                                  <Heart size={16} fill={likedMemories.has(memory.id) ? 'currentColor' : 'none'} />
                                  <span className="text-sm">
                                    {memoryLikeCounts[memory.id] > 0 ? memoryLikeCounts[memory.id] : 'Like'}
                                  </span>
                                </button>
                                <button 
                                  onClick={() => handleCommentMemory(memory.id)}
                                  className="flex items-center space-x-1 text-slate-500 hover:text-slate-700 transition-colors"
                                >
                                  <MessageCircle size={16} />
                                  <span className="text-sm">Comment</span>
                                </button>
                                <button 
                                  onClick={() => handleShareMemory(memory)}
                                  className="flex items-center space-x-1 text-slate-500 hover:text-slate-700 transition-colors"
                                >
                                  <Share size={16} />
                                  <span className="text-sm">Share</span>
                                </button>
                              </div>
                              <div className="flex items-center space-x-2">
                                {onEdit && (
                                  <button 
                                    onClick={() => onEdit(memory)}
                                    className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
                                  >
                                    Edit
                                  </button>
                                )}
                                {onDelete && (
                                  <button 
                                    onClick={() => onDelete(memory)}
                                    className="text-xs text-red-500 hover:text-red-700 transition-colors"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </article>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {/* Load More / End of Timeline */}
                <div className="text-center py-8">
                  <div className="inline-flex items-center space-x-2 text-slate-500">
                    <div className="w-4 h-4 bg-slate-300 rounded-full"></div>
                    <span className="text-sm">You've reached the beginning of your story</span>
                    <div className="w-4 h-4 bg-slate-300 rounded-full"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Chapter Modal */}
      <EditChapterModal
        chapter={editingChapter}
        isOpen={showEditModal}
        onClose={() => {
          // This will only be called if the modal confirms it's safe to close
          setShowEditModal(false)
          setEditingChapter(null)
        }}
        onSuccess={() => {
          // Refresh chapters after successful edit
          fetchChapters()
        }}
      />

      {/* Mobile Floating Add Button - Alternative for small screens */}
      <button
        onClick={() => onStartCreating?.()}
        className="sm:hidden fixed bottom-6 right-6 bg-sky-600 hover:bg-sky-700 text-white w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-10"
        title="Add Memory"
      >
        <Plus size={20} />
      </button>

    </div>
  )
}
