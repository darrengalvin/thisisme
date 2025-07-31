'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, ZoomIn, ZoomOut, Calendar, Play, Camera, Eye, MessageCircle, Heart, Share, Edit } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { MemoryWithRelations, TimeZoneWithRelations } from '@/lib/types'
import EditChapterModal from './EditChapterModal'

type ZoomLevel = 'decades' | 'years' | 'months'

interface ChronologicalTimelineViewProps {
  memories: MemoryWithRelations[]
  birthYear?: number
  onStartCreating?: (chapterId?: string, chapterTitle?: string) => void
  onZoomChange?: (zoomLevel: ZoomLevel, currentYear: number, formatLabel: () => string, handlers: {
    zoomIn: () => void
    zoomOut: () => void
    navigatePrev: () => void
    navigateNext: () => void
    canZoomIn: boolean
    canZoomOut: boolean
  }) => void
  isNewUser?: boolean
}

export default function ChronologicalTimelineView({ 
  memories, 
  birthYear: propBirthYear,
  onStartCreating,
  onZoomChange,
  isNewUser = false
}: ChronologicalTimelineViewProps) {
  const { user } = useAuth()
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('decades')
  const [currentViewYear, setCurrentViewYear] = useState(new Date().getFullYear())
  const [chapters, setChapters] = useState<TimeZoneWithRelations[]>([])
  const [isLoadingChapters, setIsLoadingChapters] = useState(true)
  // Chapter creation modal removed - using header button and CreateTimeZone component
  const [expandedMemory, setExpandedMemory] = useState<string | null>(null)
  
  // Edit chapter modal state
  const [editingChapter, setEditingChapter] = useState<TimeZoneWithRelations | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  const birthYear = propBirthYear || 1981 // From user profile with fallback
  const currentYear = new Date().getFullYear()
  
  console.log('🎂 BIRTH YEAR:', { propBirthYear, used: birthYear })
  console.log('👤 TIMELINE USER:', { hasUser: !!user, userId: user?.id, userEmail: user?.email, userObject: user })

  // Fetch chapters
  const fetchChapters = useCallback(async () => {
    console.log('🏃 FETCH CHAPTERS: Starting...', { hasUser: !!user, userId: user?.id })
    try {
      if (!user) {
        console.log('❌ FETCH CHAPTERS: No user found')
        setIsLoadingChapters(false)
        return
      }

      console.log('🔑 FETCH CHAPTERS: Getting auth token for user:', user.id)

      // Get custom JWT token for API
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      if (!tokenResponse.ok) {
        console.error('❌ FETCH CHAPTERS: Failed to get auth token:', tokenResponse.status)
        setIsLoadingChapters(false)
        return
      }

      const { token } = await tokenResponse.json()
      console.log('✅ FETCH CHAPTERS: Got auth token')

      console.log('📡 FETCH CHAPTERS: Calling /api/timezones')
      const response = await fetch('/api/timezones', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('📡 FETCH CHAPTERS: Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ FETCH CHAPTERS: HTTP error:', response.status, errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('📊 FETCH CHAPTERS: Raw response data:', data)
      console.log('📁 FETCH CHAPTERS: TimeZones found:', data.timeZones?.length || 0)
      
      setChapters(data.timeZones || [])
      console.log('✅ FETCH CHAPTERS: TimeZones set in state as chapters')
    } catch (error) {
      console.error('💥 FETCH CHAPTERS: Error:', error)
    } finally {
      setIsLoadingChapters(false)
      console.log('🏁 FETCH CHAPTERS: Complete')
    }
  }, [user])

  // Initial fetch
  useEffect(() => {
    if (user) {
      console.log('🚀 TIMELINE: Initial fetch for user:', user.id)
      fetchChapters()
    }
  }, [user, fetchChapters])

  // Refetch chapters when memories change (fetch regardless of memory count)
  useEffect(() => {
    if (user) {
      console.log('🔄 TIMELINE: Refreshing chapters after memory change')
      fetchChapters()
    }
  }, [memories.length, fetchChapters, user])

  // Debug logging
  useEffect(() => {
    console.log('🌟 TIMELINE: Data update -', memories.length, 'memories and', chapters.length, 'chapters')
    console.log('📊 ALL MEMORIES:', memories.map(m => ({ 
      id: m.id, 
      title: m.title, 
      timeZoneId: m.timeZoneId,
      hasMedia: !!m.media,
      mediaCount: m.media?.length || 0 
    })))
    console.log('📁 ALL CHAPTERS:', chapters.filter(c => c && c.id && c.title).map(c => ({ 
      id: c.id, 
      title: c.title,
      hasHeaderImage: !!c.headerImageUrl 
    })))
  }, [memories, chapters])

  // Notify parent about zoom state changes
  useEffect(() => {
    if (onZoomChange) {
      const handlers = {
        zoomIn: handleZoomIn,
        zoomOut: handleZoomOut,
        navigatePrev: () => navigateYear('prev'),
        navigateNext: () => navigateYear('next'),
        canZoomIn: zoomLevel !== 'months',
        canZoomOut: zoomLevel !== 'decades'
      }
      onZoomChange(zoomLevel, currentViewYear, formatZoomLabel, handlers)
    }
  }, [zoomLevel, currentViewYear])

  const handleZoomIn = () => {
    if (zoomLevel === 'decades') {
      setZoomLevel('years')
      setCurrentViewYear(currentYear)
    } else if (zoomLevel === 'years') {
      setZoomLevel('months')
    }
  }

  const handleZoomOut = () => {
    if (zoomLevel === 'months') {
      setZoomLevel('years')
    } else if (zoomLevel === 'years') {
      setZoomLevel('decades')
      setCurrentViewYear(currentYear)
    }
  }

  const navigateYear = (direction: 'prev' | 'next') => {
    if (zoomLevel === 'years') {
      setCurrentViewYear(prev => direction === 'next' ? prev + 1 : prev - 1)
    } else if (zoomLevel === 'months') {
      setCurrentViewYear(prev => direction === 'next' ? prev + 1 : prev - 1)
    } else if (zoomLevel === 'decades') {
      setCurrentViewYear(prev => direction === 'next' ? prev + 10 : prev - 10)
    }
  }

  const formatZoomLabel = () => {
    switch (zoomLevel) {
      case 'decades': return 'Decades View'
      case 'years': return `Years View (around ${currentViewYear})`
      case 'months': return `Monthly View • ${currentViewYear}`
      default: return 'Timeline View'
    }
  }

  // Chapter creation function removed - using header button and CreateTimeZone component

  const getMediaThumbnail = (memory: MemoryWithRelations) => {
    if (!memory.media || memory.media.length === 0) return null
    const firstMedia = memory.media[0]
    return firstMedia.thumbnail_url || firstMedia.storage_url
  }

  const getMediaType = (memory: MemoryWithRelations) => {
    if (!memory.media || memory.media.length === 0) return 'text'
    const firstMedia = memory.media[0]
    if (firstMedia.type === 'IMAGE') return 'image'
    if (firstMedia.type === 'VIDEO') return 'video'
    return 'file'
  }

  // Generate animated years for current zoom level
  const generateAnimatedYears = () => {
    const years = []
    switch (zoomLevel) {
      case 'decades':
        for (let decade = Math.floor(birthYear / 10) * 10; decade <= currentYear; decade += 10) {
          years.push({
            year: decade,
            label: `${decade}s`,
            isMarker: true
          })
        }
        break
      case 'years':
        const startYear = Math.max(birthYear, currentViewYear - 10)
        const endYear = Math.min(currentYear, currentViewYear + 10)
        for (let year = startYear; year <= endYear; year++) {
          years.push({
            year,
            label: year.toString(),
            isMarker: true
          })
        }
        break
      case 'months':
        for (let month = 1; month <= 12; month++) {
          years.push({
            year: currentViewYear,
            month,
            label: new Date(currentViewYear, month - 1).toLocaleDateString('en-US', { month: 'short' }),
            isMarker: true
          })
        }
        break
    }
    return years
  }

  const animatedYears = generateAnimatedYears()

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-white overflow-y-auto">
      {/* Horizontal Zoomable Timeline - Always show for timeline view */}
      {birthYear && (
        <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 p-4 lg:p-6">
          <div className="text-center mb-4 lg:mb-6">
            <h3 className="text-lg lg:text-xl font-bold text-slate-900 mb-2">
              Your Life Timeline
            </h3>
            <p className="text-slate-600 text-sm lg:text-base">
              {birthYear} - {currentYear} • {currentYear - birthYear} years
            </p>
          </div>

          {/* Timeline Visualization */}
          <div className="relative">
            {/* Main timeline line */}
            <div className="h-1 bg-gradient-to-r from-slate-300 via-slate-400 to-slate-500 rounded-full mb-2"></div>
            
            {/* Year markers */}
            <div className="flex justify-between items-center relative">
              {animatedYears.map((yearData, index) => (
                <div key={`${yearData.year}-${yearData.month || 0}`} className="flex flex-col items-center">
                  <div className="w-2 h-2 bg-slate-400 rounded-full -mt-1.5 mb-1"></div>
                  <span className="text-xs text-slate-600 font-medium">
                    {yearData.label}
                  </span>
                  {zoomLevel === 'months' && (
                    <span className="text-xs text-slate-500 mt-1">
                      {currentViewYear}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Chapter positioning area */}
            <div className={`relative ${chapters.length > 0 ? 'mt-8 mb-16' : 'mt-0 mb-0'}`} style={{ minHeight: chapters.length > 0 ? `${Math.max(600, chapters.length * 350 + 400)}px` : '20px' }}>
              <div className="absolute inset-0">
                {/* Positioned chapters */}
                {chapters.filter(chapter => chapter && chapter.id && chapter.title).map((chapter, chapterIndex) => {
                  const chapterMemories = memories.filter(m => m.timeZoneId === chapter.id)
                  console.log(`📊 CHAPTER "${chapter.title}": ${chapterMemories.length} memories`)
                  
                  const startYear = chapter.startDate ? new Date(chapter.startDate).getFullYear() : birthYear
                  const endYear = chapter.endDate ? new Date(chapter.endDate).getFullYear() : currentYear
                  
                  // Calculate position based on current timeline range
                  let timelineStartYear, timelineEndYear
                  switch (zoomLevel) {
                    case 'decades':
                      timelineStartYear = Math.floor(birthYear / 10) * 10
                      timelineEndYear = currentYear
                      break
                    case 'years':
                      timelineStartYear = Math.max(birthYear, currentViewYear - 10)
                      timelineEndYear = Math.min(currentYear, currentViewYear + 10)
                      break
                    case 'months':
                      timelineStartYear = currentViewYear
                      timelineEndYear = currentViewYear
                      break
                  }
                  
                  const chapterOverlapsTimeline = (
                    (startYear >= timelineStartYear && startYear <= timelineEndYear) ||
                    (endYear >= timelineStartYear && endYear <= timelineEndYear) ||
                    (startYear <= timelineStartYear && endYear >= timelineEndYear)
                  )
                  
                  if (!chapterOverlapsTimeline) {
                    return null
                  }
                  
                  const totalYears = timelineEndYear - timelineStartYear + 1
                  const adjustedStartYear = Math.max(startYear, timelineStartYear)
                  const adjustedEndYear = Math.min(endYear, timelineEndYear)
                  
                  const chapterStartOffset = ((adjustedStartYear - timelineStartYear) / totalYears) * 100
                  const chapterDuration = ((adjustedEndYear - adjustedStartYear + 1) / totalYears) * 100
                  
                  const minWidth = 180
                  const maxWidth = 280
                  
                  // Simple stacking: if chapters overlap in time, stack them vertically
                  let verticalOffset = 80
                  
                  // Look at all previous chapters and see if any overlap with current chapter
                  for (let i = 0; i < chapterIndex; i++) {
                    const otherChapter = chapters[i]
                    if (!otherChapter || !otherChapter.startDate || !otherChapter.endDate) continue
                    
                    const otherStartYear = new Date(otherChapter.startDate).getFullYear()
                    const otherEndYear = new Date(otherChapter.endDate).getFullYear()
                    
                    // Simple overlap check: do the years overlap at all?
                    const hasOverlap = !(endYear < otherStartYear || startYear > otherEndYear)
                    
                    if (hasOverlap) {
                      verticalOffset += 350 // Stack this chapter 350px lower (increased for better spacing)
                    }
                  }
                  
                  return (
                    <div
                      key={chapter.id}
                      className="absolute"
                      style={{
                        top: `${verticalOffset}px`,
                        left: `${Math.max(0, Math.min(chapterStartOffset, 85))}%`,
                        width: `${Math.min(maxWidth, Math.max(minWidth, (chapterDuration * 8)))}px`
                      }}
                    >
                      {/* Connection line to timeline */}
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-0.5 h-6 bg-slate-400"></div>
                      
                      <div className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
                        {/* Chapter Header Image */}
                        {chapter.headerImageUrl && (
                          <div className="relative h-16 bg-slate-100">
                            <img 
                              src={chapter.headerImageUrl} 
                              alt={chapter.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/10"></div>
                          </div>
                        )}
                        
                        {/* Chapter Header */}
                        <div className="p-3 border-b border-slate-100">
                          <div className="flex items-start justify-between mb-1">
                            <h5 className="font-semibold text-slate-900 text-sm leading-tight">
                              {chapter.title}
                            </h5>
                          </div>
                          <div className="text-xs text-slate-500 mb-1">
                            {startYear} - {endYear === currentYear ? 'Present' : endYear}
                          </div>
                          {chapter.description && (
                            <p className="text-xs text-slate-600 line-clamp-2">{chapter.description}</p>
                          )}
                        </div>

                        {/* Memory Thumbnails */}
                        {chapterMemories.length > 0 && (
                          <div className="p-3 border-b border-slate-50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-slate-700">
                                {chapterMemories.length} {chapterMemories.length === 1 ? 'Memory' : 'Memories'}
                              </span>
                            </div>
                            <div className="grid grid-cols-4 gap-1">
                              {chapterMemories.slice(0, 4).map((memory, memIndex) => {
                                const thumbnail = getMediaThumbnail(memory)
                                const mediaType = getMediaType(memory)
                                const memoryDate = memory.createdAt ? new Date(memory.createdAt).toLocaleDateString('en-GB', {
                                  day: 'numeric',
                                  month: 'long', 
                                  year: 'numeric'
                                }) : 'No date'
                                
                                return (
                                  <div
                                    key={memory.id}
                                    className="relative aspect-square bg-slate-100 rounded overflow-hidden group cursor-pointer hover:ring-2 hover:ring-blue-500 hover:bg-blue-50 transition-all duration-200 hover:z-[60]"
                                    onClick={() => setExpandedMemory(expandedMemory === memory.id ? null : memory.id)}
                                    onMouseEnter={() => console.log('🖱️ HOVER ENTER:', memory.title)}
                                    onMouseLeave={() => console.log('🖱️ HOVER LEAVE:', memory.title)}
                                  >
                                    {thumbnail ? (
                                      <>
                                        <img
                                          src={thumbnail}
                                          alt={memory.title || 'Memory'}
                                          className="w-full h-full object-cover"
                                        />
                                        {mediaType === 'video' && (
                                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                            <Play size={8} className="text-white" />
                                          </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200">
                                          <div className="absolute top-1 right-1">
                                            <Eye size={8} className="text-white drop-shadow-sm" />
                                          </div>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="w-full h-full bg-slate-200 flex items-center justify-center group-hover:bg-slate-300 transition-colors">
                                        <Camera size={8} className="text-slate-400" />
                                      </div>
                                    )}
                                    
                                    {/* Enhanced Hover Preview Card - centered and always visible */}
                                    <div className="fixed top-1/4 left-1/2 transform -translate-x-1/2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-[9999] overflow-hidden">
                                      {/* Small indicator dot */}
                                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border border-slate-200 rotate-45 shadow-lg"></div>
                                      {/* Large image preview */}
                                      {thumbnail ? (
                                        <div className="relative h-48 bg-slate-100">
                                          <img
                                            src={thumbnail}
                                            alt={memory.title || 'Memory'}
                                            className="w-full h-full object-cover"
                                          />
                                          {mediaType === 'video' && (
                                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                              <div className="bg-white/95 rounded-full p-4 shadow-lg">
                                                <Play size={20} className="text-slate-700" />
                                              </div>
                                            </div>
                                          )}
                                          <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-3 py-1 rounded-full font-medium">
                                            {mediaType === 'video' ? '🎥 Video' : '📸 Image'}
                                          </div>
                                          {/* Gradient overlay for better text readability */}
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                                        </div>
                                      ) : (
                                        <div className="h-56 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                                          <div className="text-center">
                                            <Camera size={40} className="text-slate-400 mx-auto mb-3" />
                                            <p className="text-slate-500 text-sm font-medium">No media attached</p>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Memory information */}
                                      <div className="p-5">
                                        <h4 className="font-bold text-slate-900 text-lg mb-2 line-clamp-2">
                                          {memory.title || 'Untitled Memory'}
                                        </h4>
                                        
                                        <div className="flex items-center text-slate-600 text-sm mb-3">
                                          <Calendar size={16} className="mr-2 text-blue-500" />
                                          <span className="font-medium">{memoryDate}</span>
                                        </div>
                                        
                                        {memory.textContent && (
                                          <div className="text-slate-700 text-sm leading-relaxed mb-4 bg-slate-50 p-3 rounded-lg">
                                            <p className="italic">
                                              "{memory.textContent.length > 150 
                                                ? memory.textContent.substring(0, 150) + '...'
                                                : memory.textContent
                                              }"
                                            </p>
                                          </div>
                                        )}
                                        
                                        {memory.media && memory.media.length > 1 && (
                                          <div className="mb-3 inline-flex items-center bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">
                                            📎 {memory.media.length} media items
                                          </div>
                                        )}
                                        
                                        <div className="pt-3 border-t border-slate-100">
                                          <p className="text-xs text-slate-500 flex items-center justify-between">
                                            <span>💫 Part of "{chapter.title}"</span>
                                            <span className="bg-slate-100 px-2 py-1 rounded">Click to expand</span>
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                              {chapterMemories.length > 4 && (
                                <div className="aspect-square bg-slate-200 rounded flex items-center justify-center">
                                  <span className="text-xs font-medium text-slate-600">
                                    +{chapterMemories.length - 4}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Chapter Actions */}
                        <div className="p-3 space-y-2">
                          <button
                            onClick={() => {
                              console.log('🔗 CHAPTER: Starting memory creation for chapter:', chapter.id, chapter.title)
                              onStartCreating?.(chapter.id, chapter.title)
                            }}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded text-xs font-medium transition-all duration-200 flex items-center justify-center space-x-1"
                          >
                            <Plus size={10} />
                            <span>Add Memory</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingChapter(chapter)
                              setShowEditModal(true)
                            }}
                            className="w-full bg-slate-50 hover:bg-slate-100 text-slate-600 py-1.5 px-3 rounded text-xs font-medium transition-all duration-200 flex items-center justify-center space-x-1"
                          >
                            <Edit size={10} />
                            <span>Edit Chapter</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Add Chapter button removed - now in header */}
              </div>
            </div>
          </div>
        </div>
          )}

      {/* Content Area Below Timeline */}
      <div className={`p-4 lg:p-8 ${(memories.length === 0 && chapters.length === 0) ? 'mt-0' : 'mt-8'}`}>
        {(memories.length === 0 && chapters.length === 0) ? (
          /* New User Welcome Experience */
          isNewUser ? (
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Welcome Header */}
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">📖</span>
                </div>
                <h1 className="text-4xl font-bold text-slate-900 mb-4">Welcome to Your Life Timeline!</h1>
                <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                  Your timeline is ready above - now let's add your first chapter to bring it to life!
                </p>
              </div>

              {/* What are Chapters Section */}
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
                  <span className="mr-3">🏛️</span>
                  What are Life Chapters?
                </h2>
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Think of chapters as life phases</h3>
                    <p className="text-slate-600">
                      Chapters help you organise your memories by meaningful time periods in your life.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Memories come later</h3>
                    <p className="text-slate-600">
                      Once you create chapters, you can add photos, videos, and stories to bring them to life.
                    </p>
                  </div>
                </div>

                {/* Chapter Ideas */}
                <div className="bg-slate-50 rounded-xl p-6 mb-8">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">💡 Chapter Ideas to Get You Started</h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { icon: "🎓", title: "School Years", desc: "University days, learning new skills" },
                      { icon: "💼", title: "Working at [Company]", desc: "First job, career adventures" },
                      { icon: "❤️", title: "Meeting Sarah", desc: "Relationships and partnerships" },
                      { icon: "🏠", title: "Living in London", desc: "Different places, new cities" },
                      { icon: "✈️", title: "Backpacking Europe", desc: "Adventures and explorations" },
                      { icon: "👶", title: "Starting a Family", desc: "Milestones and celebrations" },
                      { icon: "🏃", title: "Marathon Training", desc: "Personal challenges and hobbies" },
                      { icon: "🎸", title: "Learning Guitar", desc: "New skills and creative pursuits" }
                    ].map((idea, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 border border-slate-200">
                        <div className="text-2xl mb-2">{idea.icon}</div>
                        <h4 className="font-semibold text-slate-800 text-sm mb-1">{idea.title}</h4>
                        <p className="text-xs text-slate-600">{idea.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Call to Action */}
                <div className="text-center">
                  <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-8 text-white">
                    <h3 className="text-2xl font-bold mb-4">Ready to Begin? 🚀</h3>
                    <p className="text-slate-200 mb-6 text-lg">
                      Create your first life chapter and watch it appear on your timeline above
                    </p>
                    <button
                      onClick={() => window.location.href = '#create-chapter'}
                      className="bg-white text-slate-800 hover:bg-slate-100 py-4 px-8 rounded-xl text-xl font-bold transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      📖 Create Your First Chapter
                    </button>
                    <p className="text-sm text-slate-300 mt-4">
                      Takes just 30 seconds • Add memories to chapters later
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Existing simple state for returning users */
            <div className="text-center py-16">
              <div className="bg-gradient-to-br from-slate-800 to-slate-600 text-white rounded-3xl p-8 shadow-xl max-w-2xl mx-auto">
                <h2 className="text-3xl font-bold mb-4">
                  🎉 Start Your Life Story!
                </h2>
                <p className="text-lg text-slate-100 mb-8 leading-relaxed">
                  Create chapters and add memories to see your beautiful timeline come to life.
                </p>
                <div className="space-y-4">
                  <button
                    onClick={() => console.log('Use header button to create chapters')}
                    className="bg-white hover:bg-slate-50 text-slate-900 py-3 px-6 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg mr-4"
                  >
                    📖 Create Chapter
                  </button>
                  <button
                    onClick={() => onStartCreating?.()}
                    className="bg-slate-700 hover:bg-slate-800 text-white py-3 px-6 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    📸 Add Memory
                  </button>
                </div>
              </div>
            </div>
          )
        ) : (
          /* Social Feed Style Timeline for users with content */
          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Your Memories</h2>
              <p className="text-slate-600">
                {memories.length} {memories.length === 1 ? 'memory' : 'memories'} across {chapters.length} {chapters.length === 1 ? 'chapter' : 'chapters'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Chapter creation modal removed - using header button and CreateTimeZone component */}
      
      {/* Edit Chapter Modal */}
      <EditChapterModal
        chapter={editingChapter}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingChapter(null)
        }}
        onSuccess={() => {
          // Refresh chapters after successful edit
          fetchChapters()
        }}
      />
    </div>
  )
} 