'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, ZoomIn, ZoomOut, Calendar, Play, Camera, Eye, MessageCircle, Heart, Share, Edit, Info, X, MapPin, Box, List } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { MemoryWithRelations, TimeZoneWithRelations } from '@/lib/types'
import EditChapterModal from './EditChapterModal'
import MemoryGlobe from './MemoryGlobe'
import DebugPanel from './DebugPanel'
import ViewMemoryModal from './ViewMemoryModal'

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
}: ChronologicalTimelineViewProps): JSX.Element {
  const { user } = useAuth()
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('decades')
  const [currentViewYear, setCurrentViewYear] = useState(new Date().getFullYear())
  const [chapters, setChapters] = useState<TimeZoneWithRelations[]>([])
  const [isLoadingChapters, setIsLoadingChapters] = useState(true)
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

  // Memory click handler - opens in view mode first
  const handleMemoryClick = useCallback((memory: MemoryWithRelations, sourceChapter?: TimeZoneWithRelations) => {
    console.log('🎯 MEMORY CLICKED (VIEW MODE):', {
      memoryTitle: memory.title,
      memoryId: memory.id,
      sourceChapter: sourceChapter?.title,
      currentModalState: showMemoryModal,
      hasSelectedMemory: !!selectedMemory
    })
    setSelectedMemory(memory)
    setMemorySourceChapter(sourceChapter || null)
    setShowMemoryModal(true)
    console.log('🎯 MEMORY MODAL SHOULD OPEN NOW')
  }, [showMemoryModal, selectedMemory])

  // Memory modal handlers
  const handleCloseMemoryModal = useCallback(() => {
    setShowMemoryModal(false)
    setSelectedMemory(null)
    setMemorySourceChapter(null)
  }, [])

  const handleSaveMemory = useCallback((updatedMemory: MemoryWithRelations) => {
    console.log('💾 MEMORY SAVED:', updatedMemory.title)
    // TODO: Update memory in the memories array
    // For now, just close the modal
    handleCloseMemoryModal()
  }, [handleCloseMemoryModal])

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
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchChapters()
    }
  }, [user, fetchChapters])

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
        const aDate = new Date(a.startDate || new Date()).getTime()
        const bDate = new Date(b.startDate || new Date()).getTime()
        return aDate - bDate
      })

    const groups = []
    let currentGroup = []
    
    for (const chapter of sortedChapters) {
      if (currentGroup.length === 0) {
        currentGroup.push(chapter)
      } else {
        const lastChapter = currentGroup[currentGroup.length - 1]
        const currentStart = new Date(chapter.startDate || new Date()).getTime()
        const lastEnd = new Date(lastChapter.endDate || new Date()).getTime()
        
        // If chapters overlap or are very close, group them
        if (currentStart <= lastEnd + (1000 * 60 * 60 * 24 * 30)) { // Within 30 days
          currentGroup.push(chapter)
        } else {
          groups.push(currentGroup)
          currentGroup = [chapter]
        }
      }
    }
    
    if (currentGroup.length > 0) {
      groups.push(currentGroup)
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
            
            {/* Chapter count indicator */}
            <div className="mt-2">
              {isLoadingChapters ? (
                <p className="text-slate-500 text-xs">Loading chapters...</p>
              ) : (
                <p className="text-slate-500 text-xs">
                  {chapters.length} life chapters loaded
                </p>
              )}
            </div>
            
            {/* Default View Toggle - Desktop */}
            <div className="absolute top-0 right-0 flex items-center">
              <span className="text-xs text-slate-500 mr-3">Default View:</span>
              <div className="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-200">
              <button
                  onClick={() => {
                    console.log('🔄 GLOBAL VIEW TOGGLE: Switching to Globe mode')
                    setIs3DMode(true)
                  }}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all duration-200 ${
                  is3DMode 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-800 hover:bg-white'
                }`}
                  title="Default to Globe View"
              >
                  <Box size={14} className="mr-1 inline" />
                  Globe
              </button>
                <button
                        onClick={() => {
                    console.log('🔄 GLOBAL VIEW TOGGLE: Switching to List mode')
                    setIs3DMode(false)
                  }}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all duration-200 ${
                    !is3DMode 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-800 hover:bg-white'
                  }`}
                  title="Default to List View"
                >
                  <List size={14} className="mr-1 inline" />
                  List
                </button>
              </div>
            </div>
          </div>

          {/* Timeline Visualization */}
            <div className="relative">
            {/* Main timeline line */}
            <div className="h-1 bg-gradient-to-r from-slate-300 via-slate-400 to-slate-500 rounded-full mb-0 relative">
            {/* Year markers */}
              {animatedYears.map((yearData, index) => (
                <div
                  key={`${yearData.year}-${yearData.month || 0}`}
                  className="absolute transform -translate-x-1/2"
                            style={{ 
                    left: `${(index / (animatedYears.length - 1)) * 100}%`,
                    top: '8px'
                  }}
                >
                  <div className="text-xs text-slate-600 font-medium whitespace-nowrap">
                    {yearData.label}
                            </div>
                              </div>
              ))}
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
                      >
                        {/* The Blob itself */}
                        <div 
                          className="rounded-full shadow-lg border-3 border-white flex items-center justify-center relative transition-all duration-200 hover:shadow-xl hover:scale-105"
                          style={{
                            width: `${blobSize}px`,
                            height: `${blobSize}px`,
                            background: `linear-gradient(135deg, hsl(${hue}, ${saturation}%, ${lightness}%) 0%, hsl(${hue}, ${saturation}%, ${lightness - 10}%) 100%)`,
                          }}
                        onMouseEnter={() => {
                          console.log('🎯 MAIN BLOB HOVER ENTER:', chapter.title)
                          setHoveredChapter(chapter.id)
                        }}
                        onMouseLeave={() => {
                          console.log('🎯 MAIN BLOB HOVER LEAVE:', chapter.title)
                          // Delay hiding to allow mouse travel to globe
                          setTimeout(() => {
                            // Check if mouse is still over chapter area or globe
                            const chapterArea = document.getElementById(`chapter-${chapter.id}`)
                            const globeContainer = document.querySelector('.memory-globe-container')
                            const isStillHovering = chapterArea?.matches(':hover') || globeContainer?.matches(':hover')
                            console.log('🎯 BLOB LEAVE CHECK:', { isStillHovering, chapterArea: !!chapterArea, globeContainer: !!globeContainer })
                            if (!isStillHovering) {
                              setHoveredChapter(null)
                            }
                          }, 300) // Increased from immediate to 300ms
                          }}
                        >
                          <span className="text-white font-bold drop-shadow-sm" style={{ fontSize: `${Math.max(12, blobSize * 0.3)}px` }}>
                            {chapter.title.charAt(0).toUpperCase()}
                          </span>
                          {chapterMemories.length > 0 && (
                            <div 
                              className="absolute -top-1 -right-1 bg-white rounded-full text-slate-700 font-bold flex items-center justify-center border-2 shadow-sm cursor-pointer"
                              style={{
                                width: `${Math.max(18, blobSize * 0.4)}px`,
                                height: `${Math.max(18, blobSize * 0.4)}px`,
                                fontSize: `${Math.max(9, blobSize * 0.2)}px`,
                                borderColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`
                              }}
                              onMouseEnter={() => {
                              console.log('🎯 COUNT BADGE HOVER ENTER:', chapter.title)
                                setHoveredChapter(chapter.id)
                              }}
                              onMouseLeave={() => {
                              console.log('🎯 COUNT BADGE HOVER LEAVE:', chapter.title)
                              // Delay hiding to allow mouse travel to globe
                              setTimeout(() => {
                                // Check if mouse is still over chapter area or globe
                                const chapterArea = document.getElementById(`chapter-${chapter.id}`)
                                const globeContainer = document.querySelector('.memory-globe-container')
                                const isStillHovering = chapterArea?.matches(':hover') || globeContainer?.matches(':hover')
                                console.log('🎯 BADGE LEAVE CHECK:', { isStillHovering, chapterArea: !!chapterArea, globeContainer: !!globeContainer })
                                if (!isStillHovering) {
                                setHoveredChapter(null)
                                }
                              }, 300) // Increased from immediate to 300ms
                              }}
                            >
                              {chapterMemories.length}
                            </div>
                          )}
                        </div>

                      {/* 3D Memory Globe - shown on hover with conditional rendering (WHITE SPACE FIX) */}
                      {hoveredChapter === chapter.id && (
                        <div 
                          className="absolute transition-all duration-700 ease-out opacity-100 translate-y-4 scale-100"
                          style={{
                            // Smart positioning to prevent edge clipping
                            left: chapterStartOffset < 25 ? '200px' : // If chapter is too far left, position globe away from left edge
                                  chapterStartOffset > 75 ? 'calc(100vw - 400px)' : // If too far right, position away from right edge  
                                  '50%', // Otherwise center on chapter
                            transform: chapterStartOffset >= 25 && chapterStartOffset <= 75 ? 'translateX(-50%)' : 'none',
                            pointerEvents: 'auto',
                            zIndex: 100,
                            minWidth: '350px' // Ensure globe has minimum space
                          }}
                        >
                          <div 
                            className="memory-globe-container"
                            onMouseEnter={() => {
                              console.log('🎯 GLOBE CONTAINER HOVER ENTER:', chapter.title)
                              setHoveredChapter(chapter.id)
                            }}
                          onMouseLeave={() => {
                              console.log('🎯 GLOBE CONTAINER HOVER LEAVE:', chapter.title)
                              // Longer delay to allow interaction with globe
                            setTimeout(() => {
                                // Check if mouse is still over chapter area or globe
                                const chapterArea = document.getElementById(`chapter-${chapter.id}`)
                                const globeContainer = document.querySelector('.memory-globe-container')
                                const isStillHovering = chapterArea?.matches(':hover') || globeContainer?.matches(':hover')
                                console.log('🎯 GLOBE LEAVE CHECK:', { isStillHovering, chapterArea: !!chapterArea, globeContainer: !!globeContainer })
                                if (!isStillHovering) {
                                  setHoveredChapter(null)
                                }
                              }, 500) // Increased from 100ms to 500ms for globe interaction
                            }}
                          >
                            <MemoryGlobe
                              memories={chapterMemories}
                              chapterTitle={chapter.title}
                              visible={hoveredChapter === chapter.id}
                              chapterColor={{ hue, saturation, lightness }}
                              is3DMode={is3DMode}
                              onMemoryClick={(memory) => handleMemoryClick(memory, chapter)}
                              onAddMemory={(chapterId, chapterTitle) => onStartCreating?.(chapterId, chapterTitle)}
                              chapter={chapter}
                            />
                                </div>
                                  </div>
                                )}
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
          )}

      {/* Mobile: Vertical Timeline with Blobs */}
      {birthYear && chapters.length > 0 && (
        <div className="md:hidden">
          {/* Mobile Header */}
          <div className="sticky top-[88px] z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/50 px-4 py-3 shadow-sm">
              <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Your Life Timeline</h3>
              <p className="text-slate-600 text-sm">{birthYear} - {currentYear} • {currentYear - birthYear} years</p>
              </div>
              
              {/* Mobile Chapter count indicator */}
              <div className="mt-2 text-center">
                {isLoadingChapters ? (
                  <p className="text-slate-500 text-xs">Loading chapters...</p>
                ) : (
                  <p className="text-slate-500 text-xs">
                    {chapters.length} life chapters loaded
                  </p>
                )}
              </div>

            {/* Mobile Default View Toggle */}
            <div className="flex items-center justify-center mt-3">
              <span className="text-xs text-slate-500 mr-3">Default:</span>
              <div className="flex items-center bg-slate-50 rounded-lg p-1 border border-slate-200">
                <button
                  onClick={() => {
                    console.log('🔄 MOBILE GLOBAL VIEW TOGGLE: Switching to Globe mode')
                    setIs3DMode(true)
                  }}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all duration-200 ${
                    is3DMode 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                  title="Default to Globe View"
                >
                  🌍 Globe
                </button>
                <button
                  onClick={() => {
                    console.log('🔄 MOBILE GLOBAL VIEW TOGGLE: Switching to List mode')
                    setIs3DMode(false)
                  }}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all duration-200 ${
                    !is3DMode 
                      ? 'bg-blue-500 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                  title="Default to List View"
                >
                  📋 List
                </button>
              </div>
            </div>
                </div>

          {/* Mobile Vertical Timeline Content */}
          <div className="pt-4 px-4 pb-8">
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-20 top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500"></div>
              
              {/* Chapter Blobs in chronological order */}
              <div className="space-y-6">
                {chapters
                  .filter(chapter => chapter && chapter.id && chapter.title)
                  .sort((a, b) => {
                    const aDate = new Date(a.startDate || new Date()).getTime()
                    const bDate = new Date(b.startDate || new Date()).getTime()
                    return aDate - bDate
                  })
                  .map((chapter, chapterIndex) => {
                    const chapterMemories = memories.filter(m => m.timeZoneId === chapter.id)
                    const startYear = chapter.startDate ? new Date(chapter.startDate).getFullYear() : birthYear
                    const endYear = chapter.endDate ? new Date(chapter.endDate).getFullYear() : currentYear
                    
                    // Generate same colors as desktop
                    const hue = (parseInt(chapter.id.replace(/[^0-9]/g, '').slice(0, 8), 10) * 137.5) % 360
                    const saturation = 70 + (chapterIndex % 3) * 5
                    const lightness = 60 + (chapterIndex % 2) * 5
                    
                    // Calculate blob size based on memory count (same as desktop, slightly larger for touch)
                    const memoryCount = chapterMemories.length
                    const blobSize = Math.min(60, Math.max(40, 40 + Math.sqrt(memoryCount) * 4))
                    
                    return (
                      <div key={`mobile-chapter-${chapter.id}`} className="relative flex items-center">
                        {/* Year label on left */}
                        <div className="flex-shrink-0 w-16 text-right pr-4">
                          <div className="text-xs font-medium text-slate-600 bg-white/90 px-2 py-1 rounded shadow-sm">
                            <div className="leading-tight">{startYear}</div>
                            {startYear !== endYear && (
                              <>
                                <div className="text-slate-400 leading-none text-center">|</div>
                                <div className="leading-tight">{endYear}</div>
                              </>
                            )}
                          </div>
      </div>

                        {/* Timeline line connection */}
                        <div className="w-4 h-0.5 bg-slate-300"></div>
                        
                        {/* Chapter Blob (same as desktop) */}
                        <div 
                          className="relative cursor-pointer transition-all duration-300"
                  onClick={() => {
                            console.log('📱 MOBILE BLOB TAP:', chapter.title)
                            if (is3DMode) {
                              // Toggle globe visibility for 3D mode
                              setHoveredChapter(hoveredChapter === chapter.id ? null : chapter.id)
                            } else {
                              // Open chapter modal for list mode (when implemented)
                              console.log('📱 LIST MODE - Chapter modal would open here')
                            }
                          }}
                        >
                          {/* The Blob itself (same styling as desktop) */}
                          <div 
                            className="rounded-full shadow-lg border-3 border-white flex items-center justify-center relative transition-all duration-200"
                            style={{
                              width: `${blobSize}px`,
                              height: `${blobSize}px`,
                              background: `linear-gradient(135deg, hsl(${hue}, ${saturation}%, ${lightness}%) 0%, hsl(${hue}, ${saturation}%, ${lightness - 10}%) 100%)`,
                            }}
                          >
                            <span className="text-white font-bold drop-shadow-sm" style={{ fontSize: `${Math.max(14, blobSize * 0.3)}px` }}>
                              {chapter.title.charAt(0).toUpperCase()}
                            </span>
                            {chapterMemories.length > 0 && (
                              <div 
                                className="absolute -top-1 -right-1 bg-white rounded-full text-slate-700 font-bold flex items-center justify-center border-2 shadow-sm cursor-pointer"
                                style={{
                                  width: `${Math.max(20, blobSize * 0.4)}px`,
                                  height: `${Math.max(20, blobSize * 0.4)}px`,
                                  fontSize: `${Math.max(10, blobSize * 0.2)}px`,
                                  borderColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  console.log('📱 MOBILE COUNT BADGE TAP:', chapter.title)
                                  setHoveredChapter(hoveredChapter === chapter.id ? null : chapter.id)
                                }}
                              >
                                {chapterMemories.length}
                </div>
              )}
                </div>
              </div>
              
                        {/* Chapter info on right */}
                        <div className="flex-1 ml-4">
                          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 shadow-sm border border-slate-200/50">
                            <h4 className="font-semibold text-slate-900 text-sm mb-1">{chapter.title}</h4>
                            <p className="text-xs text-slate-600 mb-1">
                              {chapter.startDate ? new Date(chapter.startDate).toLocaleDateString() : 'Unknown'} - {chapter.endDate ? new Date(chapter.endDate).toLocaleDateString() : 'Present'}
                            </p>
                            {chapter.location && (
                              <p className="text-xs text-slate-500">📍 {chapter.location}</p>
                            )}
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-slate-600">
                                {chapterMemories.length > 0 ? `${chapterMemories.length} memories` : 'No memories yet'}
                              </span>
                              <span className="text-xs text-blue-600 font-medium">
                                {is3DMode ? 'Tap blob for globe →' : 'Tap to explore →'}
                              </span>
                           </div>
                       </div>
                  </div>
                </div>
                    )
                  })}
              </div>
              
              {/* Mobile Globe gets rendered separately - see below timeline container */}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Globe - Central Overlay (Mobile Only) */}
      {hoveredChapter && is3DMode && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setHoveredChapter(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Globe Header */}
            <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-4 border-b border-slate-200">
                  <div className="text-center">
                <h5 className="font-bold text-slate-900 text-lg mb-1">
                  {chapters.find(c => c.id === hoveredChapter)?.title}
                </h5>
                <p className="text-slate-600 text-sm">
                  {memories.filter(m => m.timeZoneId === hoveredChapter).length} memories
                    </p>
                  </div>
                <button
                onClick={() => setHoveredChapter(null)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                ✕
                </button>
              </div>

            {/* Globe Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <MemoryGlobe
                memories={memories.filter(m => m.timeZoneId === hoveredChapter)}
                chapterTitle={chapters.find(c => c.id === hoveredChapter)?.title || ''}
                visible={true}
                chapterColor={{ 
                  hue: (parseInt((hoveredChapter || '').replace(/[^0-9]/g, '').slice(0, 8), 10) * 137.5) % 360,
                  saturation: 70,
                  lightness: 60
                }}
                is3DMode={is3DMode}
                onMemoryClick={(memory) => handleMemoryClick(memory, chapters.find(c => c.id === hoveredChapter))}
                onAddMemory={(chapterId, chapterTitle) => onStartCreating?.(chapterId, chapterTitle)}
                chapter={chapters.find(c => c.id === hoveredChapter)}
              />
                                </div>
            
                        {/* Globe Footer with action hint */}
                                                                        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-center">
                          <p className="text-xs text-slate-500">
                Tap pictures to view memories • Use 🌍/📋 toggle for this chapter • Tap outside to close
              </p>
            </div>
                      </div>
        </div>
      )}

      {/* Debug Panel */}
      <DebugPanel
        hoveredChapter={hoveredChapter}
        is3DMode={is3DMode}
        globeVisible={hoveredChapter !== null}
        memories={memories}
        chapters={chapters}
      />

      {/* Memory Details Modal */}
      <ViewMemoryModal
        memory={selectedMemory}
        isOpen={showMemoryModal}
        onClose={handleCloseMemoryModal}
        onSave={handleSaveMemory}
      />

      {/* Chapter Detail Modal */}
      {showChapterModal && selectedChapter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">{selectedChapter.title}</h3>
              <button
                onClick={() => setShowChapterModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {selectedChapter.headerImageUrl && (
                <div className="w-full h-32 rounded-lg overflow-hidden">
                  <img
                    src={selectedChapter.headerImageUrl}
                    alt={selectedChapter.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm text-slate-600">
                  <strong>Period:</strong> {selectedChapter.startDate ? new Date(selectedChapter.startDate).toLocaleDateString() : 'Unknown'} - {selectedChapter.endDate ? new Date(selectedChapter.endDate).toLocaleDateString() : 'Present'}
                </p>
                
                {selectedChapter.description && (
                  <p className="text-sm text-slate-600">
                    <strong>Description:</strong> {selectedChapter.description}
                  </p>
                )}

                {selectedChapter.location && (
                  <p className="text-sm text-slate-600">
                    <strong>Location:</strong> {selectedChapter.location}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowChapterModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setEditingChapter(selectedChapter)
                  setShowEditModal(true)
                  setShowChapterModal(false)
                }}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors font-medium"
              >
                Edit Chapter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Chapter Modal */}
      <EditChapterModal
        chapter={editingChapter}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingChapter(null)
        }}
        onSuccess={() => {
          setShowEditModal(false)
          setEditingChapter(null)
          // Trigger a refresh of the data
          window.location.reload()
        }}
      />
    </div>
  )
} 