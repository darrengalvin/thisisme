'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Bug, X, MousePointer, Eye, EyeOff, Target } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'

interface DebugPanelProps {
  hoveredChapter?: string | null
  is3DMode?: boolean
  globeVisible?: boolean
  memories?: any[]
  chapters?: any[]
}

export default function DebugPanel({ 
  hoveredChapter, 
  is3DMode, 
  globeVisible,
  memories = [],
  chapters = []
}: DebugPanelProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [lastHover, setLastHover] = useState<string>('')
  const [hoverCount, setHoverCount] = useState(0)
  const [isInWhiteSpace, setIsInWhiteSpace] = useState(true)
  const [hoverTarget, setHoverTarget] = useState<string>('none')
  const panelRef = useRef<HTMLDivElement>(null)

  // Only show for specific user
  const isDebugUser = user?.email === 'dgalvin@yourcaio.co.uk'

  // Track mouse position and hover targets
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
      
      // Detect what element is being hovered
      const element = e.target as HTMLElement
      const isDebugPanel = panelRef.current?.contains(element)
      
      if (isDebugPanel) {
        setHoverTarget('debug-panel')
        setIsInWhiteSpace(false)
        return
      }
      
      // Check for chapter-related elements
      if (element.closest('[data-timeline-marker]')) {
        setHoverTarget('timeline-marker')
        setIsInWhiteSpace(false)
      } else if (element.closest('.memory-globe-container')) {
        setHoverTarget('memory-globe-content')
        setIsInWhiteSpace(false)
      } else if (element.textContent?.match(/^\d+$/) && element.closest('[style*="hsl("]')) {
        setHoverTarget('memory-count-badge')
        setIsInWhiteSpace(false)
      } else if (element.closest('[id^="chapter-"]')) {
        setHoverTarget('chapter-blob')
        setIsInWhiteSpace(false)
      } else if (element.closest('.group') && element.closest('[style*="left:"]')) {
        setHoverTarget('chapter-area')
        setIsInWhiteSpace(false)
      } else {
        setHoverTarget('none')
        setIsInWhiteSpace(true)
      }
    }

    if (isOpen) {
      window.addEventListener('mousemove', handleMouseMove)
      return () => window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [isOpen])

  // Track hover changes
  useEffect(() => {
    if (hoveredChapter && hoveredChapter !== lastHover) {
      setLastHover(hoveredChapter)
      setHoverCount(prev => prev + 1)
      console.log('🐛 DEBUG: Chapter hover changed to:', hoveredChapter)
    }
  }, [hoveredChapter, lastHover])

  if (!isDebugUser) {
    return null
  }

  return (
    <>
      {/* Debug Bug Icon - Fixed Position */}
      <div className="fixed bottom-4 right-4 z-[99999]">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-12 h-12 rounded-full shadow-lg transition-all duration-300 ${
            isOpen 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-orange-500 hover:bg-orange-600 text-white animate-pulse'
          }`}
          title="Debug Panel (dgalvin@yourcaio.co.uk only)"
        >
          {isOpen ? <X size={20} /> : <Bug size={20} />}
        </button>
      </div>

      {/* Debug Panel */}
      {isOpen && (
        <div 
          ref={panelRef}
          className="fixed bottom-20 right-4 w-80 bg-black/95 text-green-400 rounded-lg shadow-2xl z-[99998] border border-green-500/30 font-mono text-xs overflow-hidden"
          style={{
            backdropFilter: 'blur(10px)',
            height: '80vh',
            maxHeight: '80vh'
          }}
        >
          {/* Header */}
          <div className="bg-green-500/20 px-3 py-2 border-b border-green-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bug size={14} className="text-green-400" />
                <span className="font-bold">DEBUG MODE</span>
              </div>
              <div className="text-xs text-green-300">
                {user?.email}
              </div>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="p-3 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 60px)' }}>
            
            {/* Mouse Tracking */}
            <div className="bg-green-500/10 rounded p-2">
              <div className="flex items-center space-x-1 mb-1">
                <MousePointer size={12} />
                <span className="font-semibold">Mouse Position</span>
              </div>
              <div className="text-green-300">
                X: {mousePos.x}px, Y: {mousePos.y}px
              </div>
              <div className={`text-xs mt-1 ${isInWhiteSpace ? 'text-red-300' : 'text-yellow-300'}`}>
                White Space: {isInWhiteSpace ? '✅ YES' : '❌ NO'}
              </div>
              <div className="text-xs text-blue-300">
                Target: {hoverTarget}
              </div>
            </div>

            {/* 3D Mode Status */}
            <div className="bg-blue-500/10 rounded p-2">
              <div className="flex items-center space-x-1 mb-1">
                {is3DMode ? <Eye size={12} /> : <EyeOff size={12} />}
                <span className="font-semibold">3D Mode</span>
              </div>
              <div className={is3DMode ? 'text-green-300' : 'text-yellow-300'}>
                {is3DMode ? '✅ ENABLED (Globe View)' : '❌ DISABLED (List View)'}
              </div>
            </div>

            {/* Globe Visibility */}
            <div className="bg-purple-500/10 rounded p-2">
              <div className="flex items-center space-x-1 mb-1">
                <Target size={12} />
                <span className="font-semibold">Globe Visibility</span>
              </div>
              <div className={globeVisible ? 'text-green-300' : 'text-red-300'}>
                {globeVisible ? '👁️ GLOBE VISIBLE' : '🙈 GLOBE HIDDEN'}
              </div>
              {hoveredChapter && (
                <div className="text-yellow-300 mt-1">
                  Hovering: "{hoveredChapter}"
                </div>
              )}
              <div className="text-xs text-purple-200 mt-1">
                Hover Delays: 300ms (blob) / 500ms (globe)
              </div>
            </div>

            {/* Hover Tracking */}
            <div className="bg-yellow-500/10 rounded p-2">
              <div className="flex items-center space-x-1 mb-1">
                <span>🎯</span>
                <span className="font-semibold">Hover Events</span>
              </div>
              <div className="text-yellow-300">
                Total Hovers: {hoverCount}
              </div>
              {lastHover && (
                <div className="text-yellow-300 text-xs">
                  Last: "{lastHover}"
                </div>
              )}
            </div>

            {/* Data Summary */}
            <div className="bg-slate-500/10 rounded p-2">
              <div className="flex items-center space-x-1 mb-1">
                <span>📊</span>
                <span className="font-semibold">Data State</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="text-green-300">
                  Chapters: {chapters.length}
                </div>
                <div className="text-green-300">
                  Memories: {memories.length}
                </div>
                <div className="text-blue-300">
                  User ID: {user?.id?.slice(0, 8)}...
                </div>
              </div>
            </div>

            {/* Expected Behavior */}
            <div className="bg-indigo-500/10 rounded p-2">
              <div className="flex items-center space-x-1 mb-1">
                <span>🤔</span>
                <span className="font-semibold">Expected Behavior</span>
              </div>
              <div className="space-y-1 text-xs text-indigo-300">
                <div className="text-yellow-300 mb-1">
                  📱 Mobile: {typeof window !== 'undefined' && window.innerWidth < 768 ? 'YES' : 'NO'} 
                  | 🖥️ Desktop: {typeof window !== 'undefined' && window.innerWidth >= 768 ? 'YES' : 'NO'}
                </div>
                {is3DMode ? (
                  <>
                    <div>• Desktop: Hover blob → Globe renders in DOM</div>
                    <div>• Mobile: Tap blob → Globe appears below</div>
                    <div>• Globe space when empty = white space</div>
                    <div>• Both use same blob visual approach</div>
                  </>
                ) : (
                  <>
                    <div>• Desktop: List view with hover previews</div>
                    <div>• Mobile: Tap blobs for details</div>
                    <div>• No 3D globes expected in list mode</div>
                  </>
                )}
              </div>
            </div>

            {/* Current Issues Detection */}
            <div className="bg-red-500/10 rounded p-2">
              <div className="flex items-center space-x-1 mb-1">
                <span>⚠️</span>
                <span className="font-semibold">Issues Detected</span>
              </div>
              <div className="space-y-1 text-xs">
                {chapters.length === 0 && (
                  <div className="text-red-300">❌ No chapters loaded</div>
                )}
                {memories.length === 0 && (
                  <div className="text-yellow-300">⚠️ No memories loaded</div>
                )}
                {is3DMode && !hoveredChapter && hoverCount === 0 && (
                  <div className="text-yellow-300">💡 Try hovering over chapter blobs</div>
                )}
                {is3DMode && globeVisible && isInWhiteSpace && (
                  <div className="text-red-300">🚨 Globe visible in white space!</div>
                )}
                {!is3DMode && (
                  <div className="text-blue-300">ℹ️ 3D mode disabled - toggle to see globes</div>
                )}
                {is3DMode && !globeVisible && isInWhiteSpace && hoverTarget === 'none' && (
                  <div className="text-green-300">✅ White space correctly detected</div>
                )}
              </div>
            </div>

            {/* Debug Actions */}
            <div className="bg-gray-500/10 rounded p-2">
              <div className="flex items-center space-x-1 mb-2">
                <span>🔧</span>
                <span className="font-semibold">Debug Actions</span>
              </div>
              <div className="space-y-2">
                <button
                  onClick={async () => {
                    const debugData = {
                      timestamp: new Date().toISOString(),
                      user: user?.email,
                      mousePosition: mousePos,
                      whiteSpace: isInWhiteSpace,
                      hoverTarget,
                      is3DMode,
                      globeVisible,
                      hoveredChapter,
                      lastHover,
                      hoverCount,
                      dataState: {
                        memoriesCount: memories.length,
                        chaptersCount: chapters.length,
                        memoryTitles: memories.map(m => m.title).slice(0, 5),
                        chapterTitles: chapters.map(c => c.title).slice(0, 5)
                      },
                      expectedBehavior: is3DMode ? 'Hover chapter blob → Globe should appear' : 'List view active, no globes',
                      currentIssue: `Globe visible: ${globeVisible}, Hover target: ${hoverTarget}`
                    }
                    
                    const debugText = `DEBUG DATA FOR AI:\n\n${JSON.stringify(debugData, null, 2)}`
                    
                    try {
                      await navigator.clipboard.writeText(debugText)
                      console.log('🐛 DEBUG: Data copied to clipboard!')
                      alert('✅ Debug data copied to clipboard!')
                    } catch (err) {
                      console.error('Failed to copy:', err)
                      console.log('🐛 DEBUG DATA FOR AI:\n', debugText)
                      alert('❌ Copy failed - check console for debug data')
                    }
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                >
                  📋 Copy Debug Data for AI
                </button>
                <button
                  onClick={() => {
                    console.log('🐛 DEBUG: Force console log dump')
                    console.log('Current State:', {
                      is3DMode,
                      globeVisible,
                      hoveredChapter,
                      memoriesCount: memories.length,
                      chaptersCount: chapters.length,
                      mousePos,
                      hoverCount,
                      isInWhiteSpace,
                      hoverTarget
                    })
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                >
                  Dump State to Console
                </button>
                <button
                  onClick={() => {
                    setHoverCount(0)
                    setLastHover('')
                  }}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded text-xs"
                >
                  Reset Hover Count
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  )
}