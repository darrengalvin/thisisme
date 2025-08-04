'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, ZoomIn, ZoomOut, Calendar, Play, Camera, Eye, MessageCircle, Heart, Share, Edit, Info, X, MapPin, Box, List } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { MemoryWithRelations, TimeZoneWithRelations } from '@/lib/types'
import EditChapterModal from './EditChapterModal'
import MemoryGlobe from './MemoryGlobe'

type ZoomLevel = 'decades' | 'years' | 'months'

interface ChronologicalTimelineViewProps {
  memories: MemoryWithRelations[]
  birthYear?: number
  onStartCreating?: (chapterId?: string, chapterTitle?: string) => void
  onCreateChapter?: () => void
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
  onCreateChapter,
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
  const [hoveredChapter, setHoveredChapter] = useState<string | null>(null)
  
  // Memory detail modal state
  const [selectedMemory, setSelectedMemory] = useState<MemoryWithRelations | null>(null)
  const [showMemoryModal, setShowMemoryModal] = useState(false)
  const [memorySourceChapter, setMemorySourceChapter] = useState<TimeZoneWithRelations | null>(null)
  
  // Chapter detail modal state
  const [selectedChapter, setSelectedChapter] = useState<TimeZoneWithRelations | null>(null)
  const [showChapterModal, setShowChapterModal] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [is3DMode, setIs3DMode] = useState(true)
  
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
      default: return 'Timeline'
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

  // Group overlapping chapters for mobile timeline
  const groupOverlappingChapters = (chapters: TimeZoneWithRelations[]) => {
    const sortedChapters = chapters
      .filter(chapter => chapter && chapter.id && chapter.title)
      .sort((a, b) => {
        const aDate = a.startDate ? new Date(a.startDate).getTime() : 0
        const bDate = b.startDate ? new Date(b.startDate).getTime() : 0
        return aDate - bDate
      })

    const groups: Array<{
      id: string
      type: 'single' | 'group'
      startYear: number
      endYear: number
      chapters: TimeZoneWithRelations[]
      memories: MemoryWithRelations[]
    }> = []

    for (let i = 0; i < sortedChapters.length; i++) {
      const currentChapter = sortedChapters[i]
      const startYear = currentChapter.startDate ? new Date(currentChapter.startDate).getFullYear() : birthYear
      const endYear = currentChapter.endDate ? new Date(currentChapter.endDate).getFullYear() : currentYear
      
      // Check if this chapter overlaps with any existing group
      let addedToGroup = false
      
      for (let j = 0; j < groups.length; j++) {
        const group = groups[j]
        
        // Check for overlap: chapters overlap if one starts before the other ends
        const hasOverlap = !(endYear < group.startYear || startYear > group.endYear)
        
        if (hasOverlap) {
          // Add to existing group
          group.chapters.push(currentChapter)
          group.memories.push(...memories.filter(m => m.timeZoneId === currentChapter.id))
          group.startYear = Math.min(group.startYear, startYear)
          group.endYear = Math.max(group.endYear, endYear)
          group.type = group.chapters.length > 1 ? 'group' : 'single'
          group.id = `group-${group.startYear}-${group.endYear}-${group.chapters.map(c => c.id).join('-')}`
          addedToGroup = true
          break
        }
      }
      
      if (!addedToGroup) {
        // Create new group
        groups.push({
          id: `group-${startYear}-${endYear}-${currentChapter.id}`,
          type: 'single',
          startYear,
          endYear,
          chapters: [currentChapter],
          memories: memories.filter(m => m.timeZoneId === currentChapter.id)
        })
      }
    }

    return groups
  }

  const mobileChapterGroups = groupOverlappingChapters(chapters)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Desktop: Horizontal Zoomable Timeline */}
      {birthYear && (
        <div className="hidden md:block fixed top-[88px] left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/50 pt-4 lg:pt-6 px-4 lg:px-6 pb-2 shadow-sm">
          <div className="text-center mb-4 lg:mb-6 relative">
            <h3 className="text-lg lg:text-xl font-bold text-slate-900 mb-2">
              Your Life Timeline
            </h3>
            <p className="text-slate-600 text-sm lg:text-base">
              {birthYear} - {currentYear} • {currentYear - birthYear} years
            </p>
            
            {/* 3D Mode Toggle - Desktop */}
            <div className="absolute top-0 right-0 flex items-center">
              <span className="text-xs text-slate-500 mr-2">View Mode:</span>
              <button
                onClick={() => setIs3DMode(!is3DMode)}
                className={`p-2 rounded-lg transition-colors ${
                  is3DMode 
                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title={is3DMode ? 'Switch to List View' : 'Switch to 3D Globe View'}
              >
                {is3DMode ? <Box size={16} /> : <List size={16} />}
              </button>
              <span className="text-xs text-slate-500 ml-2">
                {is3DMode ? '3D Globe' : 'List View'}
              </span>
            </div>
          </div>

          {/* Timeline Visualization */}
          <div className="relative">
            {/* Main timeline line */}
            <div className="h-1 bg-gradient-to-r from-slate-300 via-slate-400 to-slate-500 rounded-full mb-0 relative">
              {/* Chapter markers on timeline */}
              {chapters.filter(chapter => chapter && chapter.id && chapter.title).map((chapter) => {
                const chapterDate = new Date(chapter.startDate || new Date());
                const timelineStart = new Date(animatedYears[0]?.year || new Date().getFullYear(), animatedYears[0]?.month || 0);
                const timelineEnd = new Date(animatedYears[animatedYears.length - 1]?.year || new Date().getFullYear(), animatedYears[animatedYears.length - 1]?.month || 11);
                const timelineSpan = timelineEnd.getTime() - timelineStart.getTime();
                const chapterOffset = ((chapterDate.getTime() - timelineStart.getTime()) / timelineSpan) * 100;
                
                
                if (chapterOffset >= 0 && chapterOffset <= 100) {
                  return (
                    <div
                      key={`timeline-marker-${chapter.id}`}
                      className="absolute top-0 transform -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${chapterOffset}%` }}
                    >
                      <div 
                        className="w-2 h-2 rounded-full border border-slate-400 opacity-60 hover:opacity-100 transition-all duration-300 hover:scale-150 cursor-pointer timeline-marker relative hover:shadow-md"
                        style={{ 
                          backgroundColor: `hsl(${(parseInt(chapter.id) * 137.5) % 360}, 60%, 55%)`,
                          borderColor: `hsl(${(parseInt(chapter.id) * 137.5) % 360}, 60%, 40%)`
                        }}
                        data-timeline-marker={chapter.id}
                        title={`Click to scroll to: ${chapter.title} (${chapterDate.toLocaleDateString()})`}
                        onClick={() => {
                          const chapterElement = document.getElementById(`chapter-${chapter.id}`);
                          chapterElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                      >
                        {/* Subtle connection indicator pointing down */}
                        <div 
                          className="absolute top-full left-1/2 transform -translate-x-1/2 opacity-0 hover:opacity-60 transition-opacity duration-300"
                          style={{ 
                            width: '0', 
                            height: '0', 
                            borderLeft: '2px solid transparent',
                            borderRight: '2px solid transparent',
                            borderTop: `3px solid hsl(${(parseInt(chapter.id) * 137.5) % 360}, 60%, 45%)`,
                            filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))'
                          }}
                        />
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
            
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
          </div>
        </div>
      )}

      {/* Mobile: Vertical Timeline */}
      {birthYear && (
        <div className="md:hidden">
          {/* Mobile Header */}
          <div className="sticky top-[88px] z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/50 px-4 py-3 shadow-sm">
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Your Life Timeline</h3>
              <p className="text-slate-600 text-sm">{birthYear} - {currentYear} • {currentYear - birthYear} years</p>
            </div>
            
            {/* Mobile Zoom Controls */}
            <div className="flex items-center justify-center space-x-2 mt-3">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel === 'decades'}
                className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <ZoomOut size={16} />
              </button>
              <span className="text-sm font-medium text-slate-700 px-3">
                {zoomLevel === 'decades' && 'Decades'}
                {zoomLevel === 'years' && 'Years'}
                {zoomLevel === 'months' && 'Months'}
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel === 'months'}
                className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <ZoomIn size={16} />
              </button>
              
              {/* 3D Mode Toggle */}
              <div className="ml-4 flex items-center">
                <button
                  onClick={() => setIs3DMode(!is3DMode)}
                  className={`p-2 rounded-lg transition-colors ${
                    is3DMode 
                      ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title={is3DMode ? 'Switch to List View' : 'Switch to 3D Globe View'}
                >
                  {is3DMode ? <Box size={16} /> : <List size={16} />}
                </button>
                <span className="text-xs text-slate-500 ml-1">
                  {is3DMode ? '3D' : 'List'}
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Vertical Timeline Content */}
          <div className="pt-4 px-4 pb-8">
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-16 top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500"></div>
              
              {/* Chapter Groups in chronological order */}
              <div className="space-y-6">
                {mobileChapterGroups.map((group, groupIndex) => {
                  const isExpanded = expandedGroups.has(group.id)
                  
                  if (group.type === 'single') {
                    // Render single chapter normally
                    const chapter = group.chapters[0]
                    const chapterMemories = group.memories
                    const startYear = group.startYear
                    const endYear = group.endYear
                    
                    return (
                      <div key={`mobile-chapter-${chapter.id}`} className="relative flex items-start">
                        {/* Timeline marker */}
                        <div className="flex-shrink-0 relative">
                          <div 
                            className="w-4 h-4 rounded-full border-2 border-white shadow-md relative z-10"
                            style={{ 
                              backgroundColor: `hsl(${(parseInt(chapter.id) * 137.5) % 360}, 60%, 55%)`,
                              left: '58px'
                            }}
                          />
                          {/* Year label - vertical */}
                          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 text-xs font-medium text-slate-600 bg-white/90 px-1.5 py-1 rounded shadow-sm text-center">
                            <div className="leading-tight">
                              {startYear}
                            </div>
                            {startYear !== endYear && (
                              <>
                                <div className="text-slate-400 leading-none">|</div>
                                <div className="leading-tight">
                                  {endYear}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Chapter card */}
                        <div 
                          id={`mobile-chapter-${chapter.id}`}
                          className="ml-8 flex-1 bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                          onClick={() => {
                            setSelectedChapter(chapter)
                            setShowChapterModal(true)
                          }}
                        >
                          {/* Chapter Header Image */}
                          {chapter.headerImageUrl && (
                            <div className="relative bg-slate-100 rounded-t-xl overflow-hidden">
                              <img 
                                src={chapter.headerImageUrl} 
                                alt={chapter.title}
                                className="w-full h-32 object-cover"
                              />
                              <div className="absolute inset-0 bg-black/10"></div>
                            </div>
                          )}
                          
                          {/* Chapter content */}
                          <div className="p-4">
                            {/* Chapter header */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-semibold text-slate-900 text-base mb-1">{chapter.title}</h4>
                                <p className="text-sm text-slate-600">
                                  {chapter.startDate ? new Date(chapter.startDate).toLocaleDateString() : 'Unknown'} - {chapter.endDate ? new Date(chapter.endDate).toLocaleDateString() : 'Present'}
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingChapter(chapter)
                                  setShowEditModal(true)
                                }}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <Edit size={14} />
                              </button>
                            </div>

                            {/* Chapter description */}
                            {chapter.description && (
                              <p className="text-sm text-slate-700 mb-3 overflow-hidden" style={{ 
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical' as const
                              }}>
                                {chapter.description}
                              </p>
                            )}

                            {/* Location */}
                            {chapter.location && (
                              <p className="text-xs text-slate-500 mb-3">📍 {chapter.location}</p>
                            )}

                            {/* Memory Thumbnails */}
                            {chapterMemories.length > 0 && (
                              <div className="mb-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-slate-700">
                                    {chapterMemories.length} {chapterMemories.length === 1 ? 'Memory' : 'Memories'}
                                  </span>
                                  <span className="text-xs text-blue-600">Tap to view →</span>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                  {chapterMemories.slice(0, 4).map((memory, memIndex) => {
                                    const thumbnail = getMediaThumbnail(memory)
                                    const mediaType = getMediaType(memory)
                                    
                                    return (
                                      <div
                                        key={memory.id}
                                        className="relative aspect-square bg-slate-100 rounded overflow-hidden"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setSelectedMemory(memory)
                                          setMemorySourceChapter(chapter)
                                          setShowMemoryModal(true)
                                        }}
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
                                                <Play size={12} className="text-white" />
                                              </div>
                                            )}
                                          </>
                                        ) : (
                                          <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                                            <Camera size={12} className="text-slate-400" />
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                  {chapterMemories.length > 4 && (
                                    <div className="aspect-square bg-slate-100 rounded flex items-center justify-center">
                                      <span className="text-xs text-slate-500 font-medium">+{chapterMemories.length - 4}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Chapter actions */}
                            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                              <span className="text-slate-500">
                                {chapterMemories.length === 0 ? 'No memories yet' : 'Tap chapter to view all'}
                              </span>
                              <div className="flex items-center space-x-2">
                                {chapterMemories.length > 0 && (
                                  <span className="text-blue-600 font-medium">View all</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  } else {
                    // Render grouped chapters
                    return (
                      <div key={`mobile-group-${group.id}`} className="relative flex items-start">
                        {/* Timeline marker with group indicator */}
                        <div className="flex-shrink-0 relative">
                          <div 
                            className="w-5 h-5 rounded-full border-2 border-white shadow-md relative z-10 flex items-center justify-center text-xs font-bold text-white"
                            style={{ 
                              backgroundColor: `hsl(220, 60%, 55%)`,
                              left: '56px'
                            }}
                          >
                            {group.chapters.length}
                          </div>
                          {/* Year label - vertical */}
                          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 text-xs font-medium text-slate-600 bg-white/90 px-1.5 py-1 rounded shadow-sm text-center">
                            <div className="leading-tight">
                              {group.startYear}
                            </div>
                            {group.startYear !== group.endYear && (
                              <>
                                <div className="text-slate-400 leading-none">|</div>
                                <div className="leading-tight">
                                  {group.endYear}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Group card */}
                        <div 
                          className="ml-8 flex-1 bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200"
                        >
                          {/* Group header */}
                          <div 
                            className="p-4 cursor-pointer"
                            onClick={() => {
                              const newExpanded = new Set(expandedGroups)
                              if (isExpanded) {
                                newExpanded.delete(group.id)
                              } else {
                                newExpanded.add(group.id)
                              }
                              setExpandedGroups(newExpanded)
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-slate-900 text-base mb-1">
                                  {group.chapters.length} Chapters in {group.startYear}
                                  {group.startYear !== group.endYear && `-${group.endYear}`}
                                </h4>
                                <p className="text-sm text-slate-600 mb-2">
                                  {group.chapters.map(c => c.title).join(' • ')}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {group.memories.length} total memories
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="text-blue-600">
                                  {isExpanded ? '−' : '+'}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Expanded chapters */}
                          {isExpanded && (
                            <div className="border-t border-slate-100">
                              {group.chapters.map((chapter, chapterIndex) => {
                                const chapterMemories = memories.filter(m => m.timeZoneId === chapter.id)
                                const startYear = chapter.startDate ? new Date(chapter.startDate).getFullYear() : birthYear
                                const endYear = chapter.endDate ? new Date(chapter.endDate).getFullYear() : currentYear
                                
                                return (
                                  <div 
                                    key={`grouped-chapter-${chapter.id}`}
                                    className="p-4 border-b border-slate-50 last:border-b-0 hover:bg-slate-50 cursor-pointer"
                                    onClick={() => {
                                      setSelectedChapter(chapter)
                                      setShowChapterModal(true)
                                    }}
                                  >
                                    {/* Chapter header */}
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <h5 className="font-medium text-slate-900 text-sm mb-1">{chapter.title}</h5>
                                        <p className="text-xs text-slate-600">
                                          {startYear} - {endYear === currentYear ? 'Present' : endYear}
                                        </p>
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setEditingChapter(chapter)
                                          setShowEditModal(true)
                                        }}
                                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                      >
                                        <Edit size={12} />
                                      </button>
                                    </div>

                                    {/* Chapter description */}
                                    {chapter.description && (
                                      <p className="text-xs text-slate-700 mb-2 line-clamp-1">
                                        {chapter.description}
                                      </p>
                                    )}

                                    {/* Memory thumbnails mini grid */}
                                    {chapterMemories.length > 0 && (
                                      <div className="flex items-center space-x-1">
                                        <div className="flex -space-x-1">
                                          {chapterMemories.slice(0, 3).map((memory, memIndex) => {
                                            const thumbnail = getMediaThumbnail(memory)
                                            return (
                                              <div
                                                key={memory.id}
                                                className="w-6 h-6 bg-slate-100 rounded border border-white overflow-hidden"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  setSelectedMemory(memory)
                                                  setMemorySourceChapter(chapter)
                                                  setShowMemoryModal(true)
                                                }}
                                              >
                                                {thumbnail ? (
                                                  <img
                                                    src={thumbnail}
                                                    alt={memory.title || 'Memory'}
                                                    className="w-full h-full object-cover"
                                                  />
                                                ) : (
                                                  <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                                                    <Camera size={8} className="text-slate-400" />
                                                  </div>
                                                )}
                                              </div>
                                            )
                                          })}
                                        </div>
                                        <span className="text-xs text-slate-500 ml-2">
                                          {chapterMemories.length} memories
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  }
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spacer for fixed timeline - Desktop only */}
      {birthYear && <div className="hidden md:block h-[160px]"></div>}

      {/* Desktop: Scrollable Chapter Canvas Area */}
      {birthYear && chapters.length > 0 && (
        <div className="hidden md:block h-[calc(100vh-300px)] overflow-y-auto bg-white border-t border-slate-200 shadow-inner">
          {/* Connection lines to timeline above */}
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-slate-100/50 to-transparent pointer-events-none"></div>
          <div className="relative" style={{ 
            height: `${Math.max(1500, chapters.filter(chapter => {
              if (!chapter?.startDate || !chapter?.endDate) return false;
              const startYear = new Date(chapter.startDate).getFullYear();
              const endYear = new Date(chapter.endDate).getFullYear();
              let timelineStartYear, timelineEndYear;
              switch (zoomLevel) {
                case 'decades':
                  timelineStartYear = Math.floor(birthYear / 10) * 10;
                  timelineEndYear = currentYear;
                  break;
                case 'years':
                  timelineStartYear = Math.max(birthYear, currentViewYear - 10);
                  timelineEndYear = Math.min(currentYear, currentViewYear + 10);
                  break;
                case 'months':
                  timelineStartYear = currentViewYear;
                  timelineEndYear = currentViewYear;
                  break;
                default:
                  return false;
              }
              return (startYear >= timelineStartYear && startYear <= timelineEndYear) ||
                     (endYear >= timelineStartYear && endYear <= timelineEndYear) ||
                     (startYear <= timelineStartYear && endYear >= timelineEndYear);
            }).length * 400 + 800)}px`
          }}>
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
                  
                  // Calculate blob size based on memory count
                  const memoryCount = chapterMemories.length
                  const blobSize = Math.min(50, Math.max(32, 32 + Math.sqrt(memoryCount) * 3)) // 32-50px based on memories
                  
                  // Implement proper vertical stacking for overlapping chapters
                  let verticalOffset = 60 // Base offset from timeline
                  
                  // Check for overlap with previous chapters
                  for (let i = 0; i < chapterIndex; i++) {
                    const otherChapter = chapters[i]
                    if (!otherChapter?.startDate || !otherChapter?.endDate) continue
                    
                    const otherStartYear = new Date(otherChapter.startDate).getFullYear()
                    const otherEndYear = new Date(otherChapter.endDate).getFullYear()
                    
                    // Check if this chapter overlaps with the current one's position
                    const currentChapterStartOffset = ((adjustedStartYear - timelineStartYear) / totalYears) * 100
                    const otherChapterStartOffset = ((Math.max(otherStartYear, timelineStartYear) - timelineStartYear) / totalYears) * 100
                    
                    // If they're close horizontally (within 8% of timeline), stack vertically
                    if (Math.abs(currentChapterStartOffset - otherChapterStartOffset) < 8) {
                      verticalOffset += 70 // Stack with 70px spacing
                    }
                  }
                  
                  // Generate a consistent color for this chapter
                  const hue = (parseInt(chapter.id.replace(/[^0-9]/g, '').slice(0, 8), 10) * 137.5) % 360
                  const saturation = 70 + (chapterIndex % 3) * 5 // Vary saturation slightly
                  const lightness = 60 + (chapterIndex % 2) * 5 // Vary lightness slightly
                  
                  return (
                    <div
                      key={chapter.id}
                      id={`chapter-${chapter.id}`}
                      className="absolute group"
                      style={{
                        top: `${verticalOffset}px`,
                        left: `${Math.max(1, Math.min(chapterStartOffset, 95))}%`,
                        transform: 'translateX(-50%)',
                        zIndex: hoveredChapter === chapter.id ? 50 : 10
                      }}
                    >
                      {/* Chapter Blob */}
                      <div 
                        className="relative cursor-pointer transition-all duration-300 hover:scale-110"
                        onClick={() => {
                          setSelectedChapter(chapter)
                          setShowChapterModal(true)
                        }}
                        onMouseEnter={() => {
                          setHoveredChapter(chapter.id)
                          const timelineMarker = document.querySelector(`[data-timeline-marker="${chapter.id}"]`) as HTMLElement;
                          if (timelineMarker) {
                            timelineMarker.style.transform = 'scale(1.4) translate(-50%, -50%)';
                            timelineMarker.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.6)';
                            timelineMarker.style.borderWidth = '3px';
                            timelineMarker.style.zIndex = '10';
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredChapter(null)
                          const timelineMarker = document.querySelector(`[data-timeline-marker="${chapter.id}"]`) as HTMLElement;
                          if (timelineMarker) {
                            timelineMarker.style.transform = 'translate(-50%, -50%)';
                            timelineMarker.style.boxShadow = '';
                            timelineMarker.style.borderWidth = '2px';
                            timelineMarker.style.zIndex = '';
                          }
                        }}
                      >
                        {/* The Blob itself */}
                        <div 
                          className="rounded-full shadow-lg border-3 border-white flex items-center justify-center relative transition-all duration-200 hover:shadow-xl hover:scale-105"
                          style={{
                            width: `${blobSize}px`,
                            height: `${blobSize}px`,
                            background: `linear-gradient(135deg, hsl(${hue}, ${saturation}%, ${lightness}%) 0%, hsl(${hue}, ${saturation}%, ${lightness - 10}%) 100%)`,
                          }}
                        >
                          <span className="text-white font-bold drop-shadow-sm" style={{ fontSize: `${Math.max(12, blobSize * 0.3)}px` }}>
                            {chapter.title.charAt(0).toUpperCase()}
                          </span>
                          {chapterMemories.length > 0 && (
                            <div 
                              className="absolute -top-1 -right-1 bg-white rounded-full text-slate-700 font-bold flex items-center justify-center border-2 shadow-sm"
                              style={{
                                width: `${Math.max(18, blobSize * 0.4)}px`,
                                height: `${Math.max(18, blobSize * 0.4)}px`,
                                fontSize: `${Math.max(9, blobSize * 0.2)}px`,
                                borderColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`
                              }}
                            >
                              {chapterMemories.length}
                            </div>
                          )}
                        </div>

                        {/* 3D Memory Globe - shown on hover with smart positioning */}
                        <div 
                          className={`absolute transition-all duration-700 ease-out ${
                            hoveredChapter === chapter.id ? 'opacity-100 translate-y-4 scale-100' : 'opacity-0 translate-y-8 scale-90'
                          }`}
                          style={{
                            // Smart positioning to prevent edge clipping
                            left: chapterStartOffset < 25 ? '200px' : // If chapter is too far left, position globe away from left edge
                                  chapterStartOffset > 75 ? 'calc(100vw - 400px)' : // If too far right, position away from right edge  
                                  '50%', // Otherwise center on chapter
                            transform: chapterStartOffset >= 25 && chapterStartOffset <= 75 ? 'translateX(-50%)' : 'none',
                            pointerEvents: hoveredChapter === chapter.id ? 'auto' : 'none',
                            zIndex: hoveredChapter === chapter.id ? 100 : 1,
                            minWidth: '350px' // Ensure globe has minimum space
                          }}
                          onMouseEnter={() => setHoveredChapter(chapter.id)}
                          onMouseLeave={() => {
                            // Add small delay before hiding to prevent flickering
                            setTimeout(() => {
                              const stillHovering = document.querySelector('.memory-globe-container:hover');
                              if (!stillHovering) {
                                setHoveredChapter(null);
                              }
                            }, 100);
                          }}
                        >
                          <div className="memory-globe-container">
                            <MemoryGlobe
                              memories={chapterMemories}
                              chapterTitle={chapter.title}
                              visible={hoveredChapter === chapter.id}
                              chapterColor={{ hue, saturation, lightness }}
                              is3DMode={is3DMode}
                            />
                            
                            {/* Compact chapter details integrated with globe */}
                            <div className="mt-8 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/50 p-3 w-72 pointer-events-auto">
                              <div className="space-y-2">
                                <div className="text-center border-b border-slate-100 pb-2">
                                  <p className="text-sm font-medium text-slate-600">
                                    {startYear} - {endYear === currentYear ? 'Present' : endYear}
                                  </p>
                                </div>
                                
                                {chapter.description && (
                                  <p className="text-xs text-slate-700 leading-relaxed line-clamp-2 text-center">
                                    {chapter.description}
                                  </p>
                                )}
                                
                                {chapter.location && (
                                  <div className="flex items-center justify-center text-xs text-slate-600">
                                    <MapPin size={12} className="mr-1" />
                                    {chapter.location}
                                  </div>
                                )}
                                
                                <div className="flex items-center justify-center space-x-4 pt-2 text-xs">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setEditingChapter(chapter)
                                      setShowEditModal(true)
                                    }}
                                    className="text-slate-600 hover:text-slate-900 font-medium transition-colors px-2 py-1 rounded hover:bg-slate-100"
                                  >
                                    Edit Chapter
                                  </button>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-blue-600 font-medium">
                                    Hover memories to explore
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Add Chapter button removed - now in header */}
            </div>
          </div>
        </div>
          )}

      {/* Content Area Below Timeline */}
      <div className={`p-4 lg:p-8 ${(memories.length === 0 && chapters.length === 0) ? 'mt-0' : 'mt-8'} pb-96`}>
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
                      onClick={() => onCreateChapter?.()}
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
                    onClick={() => onCreateChapter?.()}
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
      
      {/* Memory Detail Modal */}
      {showMemoryModal && selectedMemory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden transform transition-all duration-300 scale-100">
            {/* Modal Header */}
            <div className="relative">
              {/* Close/Back Button */}
              {memorySourceChapter ? (
                <button
                  onClick={() => {
                    setShowMemoryModal(false)
                    setSelectedMemory(null)
                    setSelectedChapter(memorySourceChapter)
                    setShowChapterModal(true)
                    setMemorySourceChapter(null)
                  }}
                  className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white rounded-lg px-3 py-1.5 flex items-center transition-all duration-200 z-10 text-sm"
                >
                  <ChevronLeft size={16} className="mr-1" />
                  Back to Chapter
                </button>
              ) : (
              <button
                onClick={() => {
                  setShowMemoryModal(false)
                  setSelectedMemory(null)
                }}
                className="absolute top-4 right-4 w-10 h-10 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center transition-all duration-200 z-10"
              >
                <X size={20} />
              </button>
              )}
              
              {/* Main Media */}
              {selectedMemory.media && selectedMemory.media.length > 0 ? (
                <div className="relative h-96 bg-slate-100">
                                     {selectedMemory.media[0].type.toLowerCase() === 'video' ? (
                     <video
                       src={selectedMemory.media[0].storage_url}
                       className="w-full h-full object-cover"
                       controls
                       autoPlay
                     />
                   ) : (
                     <img
                       src={selectedMemory.media[0].storage_url}
                       alt={selectedMemory.title || 'Memory'}
                       className="w-full h-full object-cover"
                     />
                   )}
                   {/* Gradient overlay for better header visibility */}
                   <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20"></div>
                   
                   {/* Memory Badge */}
                   <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm text-slate-700 px-3 py-2 rounded-lg font-medium text-sm shadow-lg">
                     {selectedMemory.media[0].type.toLowerCase() === 'video' ? '🎥 Video Memory' : '📸 Photo Memory'}
                   </div>
                </div>
              ) : (
                <div className="h-64 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                  <div className="text-center">
                    <Camera size={64} className="text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg font-medium">Text Memory</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Modal Content */}
            <div className="p-6 max-h-96 overflow-y-auto">
              {/* Memory Title & Date */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  {selectedMemory.title || 'Untitled Memory'}
                </h2>
                <div className="flex items-center text-slate-600 text-sm">
                  <Calendar size={16} className="mr-2 text-blue-500" />
                  <span className="font-medium">
                    {selectedMemory.createdAt ? new Date(selectedMemory.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'No date'}
                  </span>
                </div>
              </div>
              
              {/* Memory Content */}
              {selectedMemory.textContent && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-3">Memory Details</h3>
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {selectedMemory.textContent}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Additional Media */}
              {selectedMemory.media && selectedMemory.media.length > 1 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-3">
                    Additional Media ({selectedMemory.media.length - 1} more)
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                                         {selectedMemory.media.slice(1).map((media, index) => (
                       <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
                         {media.type.toLowerCase() === 'video' ? (
                           <video
                             src={media.storage_url}
                             className="w-full h-full object-cover"
                             muted
                           />
                         ) : (
                           <img
                             src={media.storage_url}
                             alt={`Media ${index + 2}`}
                             className="w-full h-full object-cover"
                           />
                         )}
                         {media.type.toLowerCase() === 'video' && (
                           <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                             <Play size={16} className="text-white" />
                           </div>
                         )}
                       </div>
                     ))}
                  </div>
                </div>
              )}
              
              {/* Memory Metadata */}
              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Part of "{selectedMemory.timeZone?.title || 'Unknown Chapter'}"</span>
                  <span>Memory ID: {selectedMemory.id.slice(0, 8)}...</span>
                </div>
              </div>
              
              {/* Future Features Placeholder */}
              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Coming Soon</h4>
                    <p className="text-blue-700 text-sm">Share, comment, and interact with memories</p>
                  </div>
                  <div className="flex space-x-2 opacity-50">
                    <button className="p-2 bg-blue-100 rounded-lg">
                      <Heart size={16} className="text-blue-600" />
                    </button>
                    <button className="p-2 bg-blue-100 rounded-lg">
                      <MessageCircle size={16} className="text-blue-600" />
                    </button>
                    <button className="p-2 bg-blue-100 rounded-lg">
                      <Share size={16} className="text-blue-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chapter Detail Modal */}
      {showChapterModal && selectedChapter && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden transform transition-all duration-300 scale-100">
            {/* Modal Header */}
            <div className="relative">
              {/* Close Button */}
              <button
                onClick={() => {
                  setShowChapterModal(false)
                  setSelectedChapter(null)
                }}
                className="absolute top-4 right-4 w-10 h-10 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center transition-all duration-200 z-10"
              >
                <X size={20} />
              </button>

              {/* Chapter Header Image */}
              {selectedChapter.headerImageUrl && (
                <div className="relative h-64 bg-slate-100">
                  <img 
                    src={selectedChapter.headerImageUrl} 
                    alt={selectedChapter.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20"></div>
                  <div className="absolute bottom-6 left-6 text-white">
                    <h2 className="text-3xl font-bold mb-2">{selectedChapter.title}</h2>
                    <p className="text-white/90">
                      {selectedChapter.startDate ? new Date(selectedChapter.startDate).getFullYear() : 'Unknown'} - {selectedChapter.endDate ? (new Date(selectedChapter.endDate).getFullYear() === currentYear ? 'Present' : new Date(selectedChapter.endDate).getFullYear()) : 'Present'}
                    </p>
                  </div>
                </div>
              )}

              {/* No Header Image Fallback */}
              {!selectedChapter.headerImageUrl && (
                <div className="bg-gradient-to-r from-slate-100 to-slate-200 h-32 flex items-center justify-center">
                  <div className="text-center">
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">{selectedChapter.title}</h2>
                    <p className="text-slate-600">
                      {selectedChapter.startDate ? new Date(selectedChapter.startDate).getFullYear() : 'Unknown'} - {selectedChapter.endDate ? (new Date(selectedChapter.endDate).getFullYear() === currentYear ? 'Present' : new Date(selectedChapter.endDate).getFullYear()) : 'Present'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-16rem)]">
              {/* Chapter Description */}
              {selectedChapter.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">About this Chapter</h3>
                  <p className="text-slate-700 leading-relaxed">{selectedChapter.description}</p>
                </div>
              )}

              {/* Subtle Edit Chapter Link */}
              <div className="mb-6">
                <button
                  onClick={() => {
                    setEditingChapter(selectedChapter)
                    setShowEditModal(true)
                    setShowChapterModal(false)
                  }}
                  className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 transition-colors duration-200 group"
                >
                  <Edit size={14} className="mr-1 group-hover:scale-110 transition-transform duration-200" />
                  Edit Chapter
                </button>
              </div>

              {/* Chapter Memories */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Memories in this Chapter</h3>
                  {onStartCreating && (
                    <button
                      onClick={() => {
                        onStartCreating(selectedChapter.id, selectedChapter.title)
                        setShowChapterModal(false)
                      }}
                      className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors duration-200"
                    >
                      <Plus size={14} className="mr-1" />
                      Add Memory
                    </button>
                  )}
                </div>

                {/* Memory Thumbnails Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {memories
                    .filter(memory => memory.timeZoneId === selectedChapter.id)
                    .map((memory) => (
                      <div
                        key={memory.id}
                        className="group cursor-pointer rounded-lg overflow-hidden border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200"
                        onClick={() => {
                          setSelectedMemory(memory)
                          setMemorySourceChapter(selectedChapter)
                          setShowMemoryModal(true)
                          setShowChapterModal(false)
                        }}
                      >
                        {(() => {
                          const thumbnail = getMediaThumbnail(memory)
                          return thumbnail && (
                            <div className="aspect-video bg-slate-100 relative overflow-hidden">
                              <img
                                src={thumbnail}
                                alt="Memory thumbnail"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              {memory.media && memory.media.length > 1 && (
                                <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                  +{memory.media.length - 1}
                                </div>
                              )}
                          </div>
                          )
                        })()}
                        <div className="p-3">
                          <h4 className="font-medium text-slate-900 text-sm mb-1 line-clamp-2">
                            {memory.title || 'Untitled Memory'}
                          </h4>
                          <p className="text-xs text-slate-500">
                            {memory.createdAt ? new Date(memory.createdAt).toLocaleDateString() : 'No date'}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>

                {/* No Memories State */}
                {memories.filter(memory => memory.timeZoneId === selectedChapter.id).length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-slate-400 mb-3">
                      <Camera size={48} className="mx-auto" />
                    </div>
                    <p className="text-slate-600 mb-4">No memories in this chapter yet</p>
                    {onStartCreating && (
                      <button
                        onClick={() => {
                          onStartCreating(selectedChapter.id, selectedChapter.title)
                          setShowChapterModal(false)
                        }}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                      >
                        <Plus size={16} className="mr-2" />
                        Add First Memory
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  )
} 