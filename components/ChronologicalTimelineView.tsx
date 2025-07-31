'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, ZoomIn, ZoomOut, Calendar, Play, Camera, Eye, MessageCircle, Heart, Share, Edit, Info, X } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { MemoryWithRelations, TimeZoneWithRelations } from '@/lib/types'
import EditChapterModal from './EditChapterModal'

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
  
  // Memory detail modal state
  const [selectedMemory, setSelectedMemory] = useState<MemoryWithRelations | null>(null)
  const [showMemoryModal, setShowMemoryModal] = useState(false)
  const [memorySourceChapter, setMemorySourceChapter] = useState<TimeZoneWithRelations | null>(null)
  
  // Chapter detail modal state
  const [selectedChapter, setSelectedChapter] = useState<TimeZoneWithRelations | null>(null)
  const [showChapterModal, setShowChapterModal] = useState(false)
  
  // Visible chapters tracking for dynamic connection lines
  const [visibleChapters, setVisibleChapters] = useState<Set<string>>(new Set())
  const [connectionLines, setConnectionLines] = useState<Array<{
    id: string
    startX: number
    startY: number
    endX: number
    endY: number
    color: string
  }>>([])

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

  // Intersection Observer for tracking visible chapters
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        setVisibleChapters((prev) => {
          const newVisible = new Set(prev)
          entries.forEach((entry) => {
            const chapterId = entry.target.id?.replace('chapter-', '')
            if (chapterId) {
              // Only show connection line if chapter is FULLY visible (100% in viewport)
              if (entry.isIntersecting && entry.intersectionRatio >= 0.99) {
                newVisible.add(chapterId)
              } else {
                // Remove line as soon as any part gets cut off
                newVisible.delete(chapterId)
              }
            }
          })
          return newVisible
        })
      },
      {
        threshold: [0, 0.1, 0.5, 1.0], // Multiple thresholds for precise control
        rootMargin: '0px 0px 0px 0px' // No margin - strict viewport boundaries
      }
    )

    // Observe all chapter elements with a small delay to ensure DOM is ready
    const setupObserver = () => {
      const chapterElements = document.querySelectorAll('[id^="chapter-"]')
      chapterElements.forEach((el) => observer.observe(el))
      
      // Initially set first few chapters as visible if they exist
      const initialVisible = new Set<string>()
      Array.from(chapterElements).slice(0, 3).forEach((el) => {
        const chapterId = el.id?.replace('chapter-', '')
        if (chapterId) {
          initialVisible.add(chapterId)
        }
      })
      if (initialVisible.size > 0) {
        setVisibleChapters(initialVisible)
      }
    }

    if (chapters.length > 0) {
      setTimeout(setupObserver, 100) // Small delay to ensure chapters are rendered
    }

    return () => {
      observer.disconnect()
    }
  }, [chapters, zoomLevel, currentViewYear]) // Re-run when chapters change OR timeline view changes

  // Update connection lines when visible chapters change
  useEffect(() => {
    const updateConnectionLines = () => {
      const lines: Array<{
        id: string
        startX: number
        startY: number
        endX: number
        endY: number
        color: string
      }> = []

      visibleChapters.forEach((chapterId) => {
        const chapterElement = document.getElementById(`chapter-${chapterId}`)
        const timelineBar = document.querySelector('.h-1.bg-gradient-to-r') // The actual timeline bar
        const timelineMarker = document.querySelector(`[data-timeline-marker="${chapterId}"]`)
        
        if (chapterElement && timelineBar && timelineMarker) {
          try {
            const chapterRect = chapterElement.getBoundingClientRect()
            const timelineBarRect = timelineBar.getBoundingClientRect()
            const markerRect = timelineMarker.getBoundingClientRect()
            
            // Validate that we have valid rects (not empty/zero)
            if (chapterRect.height === 0 || timelineBarRect.height === 0 || markerRect.width === 0) {
              return // Skip this chapter if elements aren't properly rendered
            }
            
            // Use marker's X position but connect directly to the timeline bar
            const startX = markerRect.left + markerRect.width / 2
            const startY = timelineBarRect.bottom + 2 // Just 2px below the timeline bar for tight connection
            const endX = chapterRect.left + chapterRect.width / 2
            const endY = chapterRect.top - 1 // Stop 1px before touching the chapter box edge
          
            lines.push({
              id: chapterId,
              startX,
              startY,
              endX,
              endY,
              color: `hsl(${(parseInt(chapterId) * 137.5) % 360}, 70%, 60%)`
            })
          } catch (error) {
            // Skip this chapter if there's an error calculating positions
            console.warn(`Error calculating connection line for chapter ${chapterId}:`, error)
          }
        }
      })

      setConnectionLines(lines)
    }

    // Use RAF to ensure DOM is ready
    if (visibleChapters.size > 0) {
      requestAnimationFrame(updateConnectionLines)
    } else {
      setConnectionLines([])
    }
  }, [visibleChapters])

  // Clear and redraw connection lines when timeline view changes
  useEffect(() => {
    // Immediately clear all connection lines and visible chapters
    setConnectionLines([])
    setVisibleChapters(new Set())
    
    // Multi-stage redraw process to ensure timeline markers are properly positioned
    const redrawLines = async () => {
      // Stage 1: Wait for initial DOM updates
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Stage 2: Check if timeline markers exist, if not wait longer
      let attempts = 0
      const maxAttempts = 10
      
      while (attempts < maxAttempts) {
        const timelineMarkers = document.querySelectorAll('[data-timeline-marker]')
        if (timelineMarkers.length > 0) {
          break // Markers are ready
        }
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }
      
      // Stage 3: Final positioning check and visibility calculation
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Force complete recalculation after all DOM changes settle
      const chapterElements = document.querySelectorAll('[id^="chapter-"]')
      const newVisible = new Set<string>()
      const visibleChapters: Array<{id: string, visibility: number}> = []
      
      chapterElements.forEach((el) => {
        const rect = el.getBoundingClientRect()
        const windowHeight = window.innerHeight
        
        // Calculate how much of the chapter is visible
        const visibleTop = Math.max(0, rect.top)
        const visibleBottom = Math.min(windowHeight, rect.bottom)
        const visibleHeight = Math.max(0, visibleBottom - visibleTop)
        const visibilityRatio = visibleHeight / rect.height
        
        if (visibilityRatio >= 0.99) { // Must be fully visible
          const chapterId = el.id?.replace('chapter-', '')
          // Double-check that timeline marker exists and is positioned
          const marker = document.querySelector(`[data-timeline-marker="${chapterId}"]`)
          if (chapterId && marker) {
            const markerRect = marker.getBoundingClientRect()
            // Only add if marker has valid position (not 0,0)
            if (markerRect.left > 0 && markerRect.top > 0) {
              visibleChapters.push({ id: chapterId, visibility: visibilityRatio })
            }
          }
        }
      })
      
      // All fully visible chapters with positioned markers get connection lines
      visibleChapters.forEach(chapter => newVisible.add(chapter.id))
      
      setVisibleChapters(newVisible)
    }
    
    redrawLines()
  }, [zoomLevel, currentViewYear]) // Re-run when timeline view changes

  // Force redraw connection lines (can be called manually)
  const forceRedrawLines = useCallback(() => {
    setConnectionLines([])
    setVisibleChapters(new Set())
    
    // Wait for state to clear, then recalculate
    setTimeout(() => {
      const chapterElements = document.querySelectorAll('[id^="chapter-"]')
      const newVisible = new Set<string>()
      
      chapterElements.forEach((el) => {
        const rect = el.getBoundingClientRect()
        const windowHeight = window.innerHeight
        const visibleHeight = Math.max(0, Math.min(windowHeight, rect.bottom) - Math.max(0, rect.top))
        const visibilityRatio = visibleHeight / rect.height
        
        if (visibilityRatio >= 0.99) {
          const chapterId = el.id?.replace('chapter-', '')
          const marker = document.querySelector(`[data-timeline-marker="${chapterId}"]`)
          if (chapterId && marker) {
            const markerRect = marker.getBoundingClientRect()
            if (markerRect.left > 0 && markerRect.top > 0) {
              newVisible.add(chapterId)
            }
          }
        }
      })
      
      setVisibleChapters(newVisible)
    }, 100)
  }, [])

  // Update connection lines on scroll with throttling
  useEffect(() => {
    let rafId: number

    const handleScroll = () => {
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
      
      rafId = requestAnimationFrame(() => {
        // Always clear old lines first to prevent triangle effect
        const lines: Array<{
          id: string
          startX: number
          startY: number
          endX: number
          endY: number
          color: string
        }> = []

        if (visibleChapters.size > 0) {
          // Double-check visibility during scroll to prevent crossover lines
          const currentlyVisible = new Set<string>()
          
          visibleChapters.forEach((chapterId) => {
            const chapterElement = document.getElementById(`chapter-${chapterId}`)
            
            // Verify chapter is still significantly visible during scroll
            if (chapterElement) {
              const rect = chapterElement.getBoundingClientRect()
              const visibleHeight = Math.max(0, Math.min(window.innerHeight, rect.bottom) - Math.max(0, rect.top))
              const visibilityRatio = visibleHeight / rect.height
              
              if (visibilityRatio >= 0.99) { // Must be fully visible during scroll
                currentlyVisible.add(chapterId)
              }
            }
          })
          
          // Only create lines for currently visible chapters
          currentlyVisible.forEach((chapterId) => {
            const chapterElement = document.getElementById(`chapter-${chapterId}`)
            const timelineBar = document.querySelector('.h-1.bg-gradient-to-r')
            const timelineMarker = document.querySelector(`[data-timeline-marker="${chapterId}"]`)
            
            if (chapterElement && timelineBar && timelineMarker) {
              try {
                const chapterRect = chapterElement.getBoundingClientRect()
                const timelineBarRect = timelineBar.getBoundingClientRect()
                const markerRect = timelineMarker.getBoundingClientRect()
                
                // Validate that we have valid rects
                if (chapterRect.height === 0 || timelineBarRect.height === 0 || markerRect.width === 0) {
                  return // Skip this chapter if elements aren't properly rendered
                }
                
                lines.push({
                  id: chapterId,
                  startX: markerRect.left + markerRect.width / 2,
                  startY: timelineBarRect.bottom + 2,
                  endX: chapterRect.left + chapterRect.width / 2,
                  endY: chapterRect.top - 1,
                  color: `hsl(${(parseInt(chapterId) * 137.5) % 360}, 70%, 60%)`
                })
              } catch (error) {
                // Skip this chapter if there's an error
                console.warn(`Error calculating scroll connection line for chapter ${chapterId}:`, error)
              }
            }
          })
        }

        // Always set connection lines (even if empty) to clear old ones
        setConnectionLines(lines)
      })
    }

    // Also trigger redraw on animation completion
    const handleAnimationEnd = () => {
      setTimeout(forceRedrawLines, 50)
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })
    window.addEventListener('transitionend', handleAnimationEnd, { passive: true })
    window.addEventListener('animationend', handleAnimationEnd, { passive: true })
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      window.removeEventListener('transitionend', handleAnimationEnd)
      window.removeEventListener('animationend', handleAnimationEnd)
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [visibleChapters])

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Desktop: Horizontal Zoomable Timeline */}
      {birthYear && (
        <div className="hidden md:block fixed top-[88px] left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/50 pt-4 lg:pt-6 px-4 lg:px-6 pb-2 shadow-sm">
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
            
            {/* Dynamic connection lines for visible chapters */}
            <div className="fixed inset-0 pointer-events-none z-50">
              <svg className="w-full h-full overflow-visible">
                {connectionLines.map((line) => (
                  <line
                    key={`connection-${line.id}`}
                    x1={line.startX}
                    y1={line.startY}
                    x2={line.endX}
                    y2={line.endY}
                    stroke="rgb(148, 163, 184)"
                    strokeWidth="1"
                    opacity="0.6"
                    className="transition-opacity duration-300"
                  />
                ))}
              </svg>
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
            </div>
          </div>

          {/* Mobile Vertical Timeline Content */}
          <div className="pt-4 px-4 pb-8">
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-16 top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500"></div>
              
              {/* Chapters in chronological order */}
              <div className="space-y-6">
                {chapters
                  .filter(chapter => chapter && chapter.id && chapter.title)
                  .sort((a, b) => {
                    const aDate = a.startDate ? new Date(a.startDate).getTime() : 0
                    const bDate = b.startDate ? new Date(b.startDate).getTime() : 0
                    return aDate - bDate
                  })
                  .map((chapter, index) => {
                    const chapterMemories = memories.filter(m => m.timeZoneId === chapter.id)
                    const startYear = chapter.startDate ? new Date(chapter.startDate).getFullYear() : birthYear
                    const endYear = chapter.endDate ? new Date(chapter.endDate).getFullYear() : currentYear
                    
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
                  
                  const minWidth = 180
                  const maxWidth = 280
                  
                  // Smart stacking: if chapters overlap in the current zoom view, stack them vertically
                  let verticalOffset = 80
                  
                  // Look at all previous chapters and see if any overlap with current chapter IN THE CURRENT ZOOM VIEW
                  for (let i = 0; i < chapterIndex; i++) {
                    const otherChapter = chapters[i]
                    if (!otherChapter || !otherChapter.startDate || !otherChapter.endDate) continue
                    
                    const otherStartYear = new Date(otherChapter.startDate).getFullYear()
                    const otherEndYear = new Date(otherChapter.endDate).getFullYear()
                    
                    // Check if the other chapter also overlaps with current timeline view
                    const otherChapterOverlapsTimeline = (
                      (otherStartYear >= timelineStartYear && otherStartYear <= timelineEndYear) ||
                      (otherEndYear >= timelineStartYear && otherEndYear <= timelineEndYear) ||
                      (otherStartYear <= timelineStartYear && otherEndYear >= timelineEndYear)
                    )
                    
                    // Only consider overlap if both chapters are visible in current zoom
                    if (otherChapterOverlapsTimeline) {
                      // Check for overlap in the current zoom range (more precise)
                      const adjustedOtherStartYear = Math.max(otherStartYear, timelineStartYear)
                      const adjustedOtherEndYear = Math.min(otherEndYear, timelineEndYear)
                      
                      // Calculate visual overlap based on current zoom level
                      let hasVisualOverlap = false
                      
                      if (zoomLevel === 'months') {
                        // In month view, chapters in the same year should stack
                        hasVisualOverlap = adjustedStartYear === adjustedOtherStartYear
                      } else {
                        // For decades and years, check if date ranges overlap
                        hasVisualOverlap = !(adjustedEndYear < adjustedOtherStartYear || adjustedStartYear > adjustedOtherEndYear)
                      }
                      
                      if (hasVisualOverlap) {
                        verticalOffset += 350 // Stack this chapter 350px lower
                      }
                    }
                  }
                  
                  return (
                    <div
                      key={chapter.id}
                      id={`chapter-${chapter.id}`}
                      className="absolute transition-all duration-700 ease-out"
                      style={{
                        top: `${verticalOffset}px`,
                        left: `${Math.max(0, Math.min(chapterStartOffset, 85))}%`,
                        width: `${Math.min(maxWidth, Math.max(minWidth, (chapterDuration * 8)))}px`,
                        transformOrigin: 'center top'
                      }}
                    >
                      {/* Date Range Header */}
                      <div className="mb-2 text-center">
                        <div className="inline-flex items-center px-3 py-1 bg-slate-800 text-white text-xs font-mono rounded-full shadow-sm">
                          <span>
                            {startYear}{endYear !== startYear && endYear !== currentYear && ` - ${endYear}`}
                            {endYear === currentYear && startYear !== currentYear && ' - Present'}
                            {startYear === endYear && startYear === currentYear && 'Present'}
                          </span>
                        </div>
                      </div>
                      
                      <div 
                        className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 ease-out overflow-visible relative hover:-translate-y-0.5 hover:scale-[1.02] cursor-pointer"
                        onClick={() => {
                          setSelectedChapter(chapter)
                          setShowChapterModal(true)
                        }}
                        style={{
                          background: `linear-gradient(135deg, 
                            rgba(255,255,255,1) 0%, 
                            rgba(255,255,255,0.95) 50%, 
                            hsla(${(parseInt(chapter.id) * 137.5) % 360}, 10%, 95%, 0.3) 100%)`
                        }}
                        onMouseEnter={() => {
                          const timelineMarker = document.querySelector(`[data-timeline-marker="${chapter.id}"]`) as HTMLElement;
                          if (timelineMarker) {
                            timelineMarker.style.transform = 'scale(1.4) translate(-50%, -50%)';
                            timelineMarker.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.6)';
                            timelineMarker.style.borderWidth = '3px';
                            timelineMarker.style.zIndex = '10';
                          }
                        }}
                        onMouseLeave={() => {
                          const timelineMarker = document.querySelector(`[data-timeline-marker="${chapter.id}"]`) as HTMLElement;
                          if (timelineMarker) {
                            timelineMarker.style.transform = 'translate(-50%, -50%)';
                            timelineMarker.style.boxShadow = '';
                            timelineMarker.style.borderWidth = '2px';
                            timelineMarker.style.zIndex = '';
                          }
                        }}
                      >
                        {/* Chapter Header Image */}
                        {chapter.headerImageUrl && (
                          <div className="relative bg-slate-100">
                            <img 
                              src={chapter.headerImageUrl} 
                              alt={chapter.title}
                              className="w-full h-auto max-h-48 object-cover"
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
                            <div className="flex items-center space-x-1">
                              {/* Info Icon with Hover Details */}
                              <div className="relative group">
                                <button
                                  className="w-6 h-6 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded transition-all duration-200 flex items-center justify-center opacity-60 hover:opacity-100"
                                  title="Chapter Details"
                                >
                                  <Info size={12} />
                                </button>
                                
                                {/* Hover Tooltip */}
                                <div className="absolute left-0 bottom-full mb-2 w-80 bg-white rounded-lg shadow-2xl border border-slate-200 p-4 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-[99999]" style={{ zIndex: 99999 }}>
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
                                  <div className="absolute -bottom-1 left-6 w-2 h-2 bg-white border-l border-b border-slate-200 transform rotate-45"></div>
                                </div>
                              </div>
                              
                              {/* Edit Icon */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingChapter(chapter)
                                  setShowEditModal(true)
                                }}
                                className="w-6 h-6 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded transition-all duration-200 flex items-center justify-center opacity-60 hover:opacity-100"
                                title="Edit Chapter"
                              >
                                <Edit size={12} />
                              </button>
                            </div>
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
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedMemory(memory)
                                      setMemorySourceChapter(null) // Clear source chapter for timeline memories
                                      setShowMemoryModal(true)
                                    }}
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
                                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">Click to view</span>
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
                        <div className="p-3">
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