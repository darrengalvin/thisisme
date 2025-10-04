'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { MemoryWithRelations } from '@/lib/types'

// 3D rotation utility functions
function rotate3D(position: { x: number; y: number; z: number }, rotX: number, rotY: number) {
  const { x, y, z } = position
  
  // Apply Y rotation (horizontal mouse movement)
  const cosY = Math.cos(rotY)
  const sinY = Math.sin(rotY)
  const x1 = x * cosY + z * sinY
  const z1 = -x * sinY + z * cosY
  
  // Apply X rotation (vertical mouse movement)
  const cosX = Math.cos(rotX)
  const sinX = Math.sin(rotX)
  const y2 = y * cosX - z1 * sinX
  const z2 = y * sinX + z1 * cosX
  
  return { x: x1, y: y2, z: z2 }
}

interface FloatingMemoryProps {
  memory: MemoryWithRelations
  position: { x: number; y: number; z: number; scale: number }
  index: number
  globeHovered: boolean
  rotationX: number
  rotationY: number
  onToggleView?: () => void
  onMemoryClick?: (memory: MemoryWithRelations) => void
  onMemoryHoverStart?: () => void
  onMemoryHoverEnd?: () => void
}

function FloatingMemory({ memory, position, index, globeHovered, rotationX, rotationY, onToggleView, onMemoryClick, onMemoryHoverStart, onMemoryHoverEnd }: FloatingMemoryProps) {
  const [individualHover, setIndividualHover] = useState(false)
  
  // Get memory thumbnail
  const thumbnail = memory.media?.[0]?.storage_url || memory.media?.[0]?.thumbnail_url
  
  // Apply 3D rotation to the position
  const rotatedPosition = rotate3D(position, rotationX, rotationY)
  
  // Calculate 3D-like positioning and scaling based on Z position
  const depth = (rotatedPosition.z + 140) / 280 // Normalize z to 0-1
  const scale = 0.5 + (depth * 0.8) // Scale from 0.5 to 1.3 based on depth
  const opacity = 0.4 + (depth * 0.6) // Opacity from 0.4 to 1.0
  const blur = Math.max(0, (1 - depth) * 0.8) // Subtle blur for depth
  
  // Subtle hover effects for memories
  const finalScale = individualHover ? 1.6 : globeHovered ? scale * 1.2 : scale
  const finalOpacity = individualHover ? 1 : globeHovered ? Math.min(1, opacity + 0.1) : opacity * 0.9
  const finalBlur = individualHover ? 0 : Math.max(0, blur - 0.5)

  // Hide memories that are too far behind the sphere
  if (rotatedPosition.z < -120) {
    return null
  }

  return (
    <div
      className="absolute"
      style={{
        left: `calc(50% + ${rotatedPosition.x}px)`,
        top: `calc(50% + ${rotatedPosition.y}px)`,
        transform: `translate(-50%, -50%)`,
        zIndex: Math.floor(depth * 100) + (individualHover ? 1000 : 0),
      }}
    >
      {/* Enlarged hover detection area for easier clicking */}
      <div
        className="absolute cursor-pointer rounded-full transition-all duration-150"
        style={{
          width: '40px',
          height: '40px', 
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1,
          backgroundColor: individualHover ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
          border: individualHover ? '2px solid rgba(59, 130, 246, 0.3)' : '2px solid transparent'
        }}
        onMouseEnter={() => {
          console.log('🎯 MEMORY HOVER ENTER:', memory.title)
          setIndividualHover(true)
          onMemoryHoverStart?.()
        }}
        onMouseLeave={() => {
          console.log('🎯 MEMORY HOVER LEAVE:', memory.title)
          setIndividualHover(false)
          onMemoryHoverEnd?.()
        }}
        onClick={(e) => {
          e.stopPropagation()
          console.log('🎯 FLOATING MEMORY CLICK:', memory.title)
          onMemoryClick?.(memory)
        }}
      />
      
      {/* Visual element that scales */}
      <div
        className="transition-all duration-200"
        style={{
          transform: `scale(${finalScale})`,
          opacity: finalOpacity,
          filter: `blur(${finalBlur}px) brightness(${individualHover ? 1.1 : 0.9})`,
          width: '52px',
          height: '52px',
        }}
      >
      {thumbnail ? (
        <img
          src={thumbnail}
          alt={memory.title || 'Memory'}
          className="w-full h-full object-cover rounded-lg shadow-md border border-white/50"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg shadow-md border border-white/50 flex items-center justify-center">
          <span className="text-slate-600 text-sm font-medium">
            {memory.title?.charAt(0) || 'M'}
          </span>
        </div>
      )}
      </div>
      
      {/* Memory tooltip on individual hover */}
      {individualHover && (
        <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 bg-black/95 text-white text-sm rounded-lg whitespace-nowrap z-50 min-w-max pointer-events-auto">
          <div className="px-3 py-2">
            <div className="font-semibold">{memory.title || 'Memory'}</div>
            {memory.createdAt && (
              <div className="text-xs opacity-75">
                {new Date(memory.createdAt).toLocaleDateString()}
              </div>
            )}
          </div>
          {onToggleView && (
            <div className="border-t border-white/20 px-3 py-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleView()
                }}
                className="flex items-center gap-2 text-xs text-blue-300 hover:text-blue-200 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
                Switch to list view
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface MemoryGlobeProps {
  memories: MemoryWithRelations[]
  chapterTitle: string
  visible: boolean
  chapterColor?: { hue: number; saturation: number; lightness: number }
  is3DMode?: boolean
  onToggleView?: () => void
  onMemoryClick?: (memory: MemoryWithRelations) => void
  onAddMemory?: (chapterId?: string, chapterTitle?: string) => void
  chapter?: { startDate?: string; endDate?: string; [key: string]: any }
}

export default function MemoryGlobe({ memories, chapterTitle, visible, chapterColor, is3DMode = true, onToggleView, onMemoryClick, onAddMemory, chapter }: MemoryGlobeProps) {
  const [memoryPositions, setMemoryPositions] = useState<Array<{
    x: number
    y: number
    z: number
    scale: number
  }>>([])
  const [globeHovered, setGlobeHovered] = useState(false)
  const [rotationX, setRotationX] = useState(0)
  const [rotationY, setRotationY] = useState(0)
  const [isRotating, setIsRotating] = useState(false)
  const [anyMemoryHovered, setAnyMemoryHovered] = useState(false)
  const [localViewMode, setLocalViewMode] = useState<'globe' | 'list'>(is3DMode ? 'globe' : 'list') // Local toggle for this specific globe

  // Reset to default view when chapter changes
  useEffect(() => {
    const defaultMode = is3DMode ? 'globe' : 'list'
    console.log('🔄 SETTING LOCAL DEFAULT MODE:', {
      chapterTitle,
      globalIs3DMode: is3DMode,
      settingLocalViewTo: defaultMode
    })
    setLocalViewMode(defaultMode)
  }, [chapterTitle, is3DMode])
  const globeRef = useRef<HTMLDivElement>(null)
  const lastMousePos = useRef({ x: 0, y: 0 })
  const animationRef = useRef<number>()

  // Generate 3D positions when component mounts or memories change
  useEffect(() => {
    if (memories.length === 0) return
    
    const positions = memories.slice(0, 15).map((_, index) => {
      // Create 3D sphere distribution
      const phi = Math.acos(1 - 2 * Math.random()) // Random phi (0 to π)
      const theta = Math.random() * 2 * Math.PI // Random theta (0 to 2π)
      const radius = 90 + Math.random() * 50 // Radius from center (90-140px)
      
      // Convert spherical to Cartesian coordinates
      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.sin(phi) * Math.sin(theta)
      const z = radius * Math.cos(phi)
      
      return {
        x: x * 0.9, // Keep most of X
        y: y * 0.7, // Flatten Y slightly for better visibility
        z: z, // Keep full Z for depth effect
        scale: 0.8 + Math.random() * 0.4 // Random scale variation
      }
    })
    
    setMemoryPositions(positions)
  }, [memories])

  // Auto-rotation when not being manually rotated and no memories are being hovered
  useEffect(() => {
    if (!visible || isRotating || anyMemoryHovered) return
    
    const animate = () => {
      setRotationY(prev => prev + 0.005) // Slow auto-rotation
      animationRef.current = requestAnimationFrame(animate)
    }
    
    animationRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [visible, isRotating, anyMemoryHovered])

  // Memory hover callbacks
  const handleMemoryHoverStart = useCallback(() => {
    console.log('🎯 MEMORY HOVER START - Pausing globe rotation')
    setAnyMemoryHovered(true)
  }, [])

  const handleMemoryHoverEnd = useCallback(() => {
    console.log('🎯 MEMORY HOVER END - Resuming globe rotation')
    setAnyMemoryHovered(false)
  }, [])

  // Mouse interaction for manual rotation (reduced sensitivity when memories are hovered)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!globeRef.current || anyMemoryHovered) return // Don't rotate when trying to click memories
    
    const rect = globeRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const mouseX = e.clientX - centerX
    const mouseY = e.clientY - centerY
    
    // Convert mouse position to rotation (more sensitive)
    const targetRotY = (mouseX / rect.width) * Math.PI * 0.8
    const targetRotX = -(mouseY / rect.height) * Math.PI * 0.4
    
    setRotationY(targetRotY)
    setRotationX(targetRotX)
    setIsRotating(true)
    
    lastMousePos.current = { x: mouseX, y: mouseY }
  }

  const handleMouseLeave = () => {
    setIsRotating(false)
    // Smoothly return to auto-rotation
    setTimeout(() => {
      setRotationX(0)
    }, 1000)
  }

  if (!visible) {
    return null
  }

  // Use chapter color or default blue
  const color = chapterColor || { hue: 213, saturation: 75, lightness: 60 }
  
  // Local view mode overrides global default - always respect local choice

  // Format year range for display
  const getYearRange = () => {
    if (!chapter?.startDate) return null
    
    const startYear = new Date(chapter.startDate).getFullYear()
    const endYear = chapter.endDate ? new Date(chapter.endDate).getFullYear() : new Date().getFullYear()
    
    if (startYear === endYear) {
      return `${startYear}`
    }
    return `${startYear} - ${endYear}`
  }

  return (
    <div className="w-72 h-72 relative pointer-events-auto">
      {localViewMode === 'globe' ? (
        <>
          {/* Improved hover zone with better detection - constrained to not overlap toggle buttons */}
          <div 
            className="absolute -top-4 -left-4 -right-4 bottom-0 rounded-full cursor-grab active:cursor-grabbing"
            onMouseEnter={() => setGlobeHovered(true)}
            onMouseLeave={() => {
              setGlobeHovered(false)
              handleMouseLeave()
            }}
            onMouseMove={handleMouseMove}
          >
        {/* 3D Sphere with proper sphere lighting and surface */}
        <div 
          ref={globeRef}
          className="absolute inset-12 rounded-full transition-all duration-500"
          style={{
            background: `
              radial-gradient(circle at ${40 + Math.cos(rotationY) * 10}% ${35 + Math.sin(rotationX) * 10}%, 
                hsla(${color.hue}, ${color.saturation}%, ${color.lightness + 10}%, 0.4) 0%, 
                hsla(${color.hue}, ${color.saturation}%, ${color.lightness}%, 0.3) 40%, 
                hsla(${color.hue}, ${color.saturation}%, ${color.lightness - 10}%, 0.25) 100%)
            `,
            backdropFilter: 'blur(10px)',
            boxShadow: `
              0 8px 32px rgba(0,0,0,0.12),
              inset 0 2px 8px rgba(255,255,255,0.2),
              0 0 ${globeHovered ? '40px' : '0px'} hsla(${color.hue}, ${color.saturation}%, ${color.lightness}%, 0.15)
            `,
            transform: `
              rotateX(${rotationX * 10}deg) 
              rotateY(${rotationY * 10}deg)
            `,
            opacity: globeHovered ? 0.95 : 0.85
          }}
        >
        </div>
        
        {/* Floating memories with 3D positioning and rotation */}
        {memories.length > 0 ? (
          memories.slice(0, 15).map((memory, index) => {
            const position = memoryPositions[index]
            if (!position) return null
            
            return (
              <FloatingMemory
                key={memory.id}
                memory={memory}
                position={position}
                index={index}
                globeHovered={globeHovered}
                rotationX={rotationX}
                rotationY={rotationY}
                onToggleView={onToggleView}
                onMemoryClick={onMemoryClick}
                onMemoryHoverStart={handleMemoryHoverStart}
                onMemoryHoverEnd={handleMemoryHoverEnd}
              />
            )
          })
        ) : (
          /* Empty state inside the globe */
          <div 
            className="absolute"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 200,
              textAlign: 'center',
              pointerEvents: 'none'
            }}
          >
            <div className="text-4xl mb-2 opacity-70">📝</div>
            <div className="text-sm font-medium text-slate-600 whitespace-nowrap">
              No memories yet
            </div>
          </div>
        )}
          </div>
        </>
      ) : (
        /* List View */
        <div className="w-full h-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-4 h-full flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 max-h-56">
              {memories
                .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                .map((memory, index) => {
                const thumbnail = memory.media?.[0]?.storage_url || memory.media?.[0]?.thumbnail_url
                return (
                  <div 
                    key={memory.id} 
                    className="flex items-center space-x-3 p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer border border-slate-100 hover:border-slate-200"
                    onClick={(e) => {
                      e.stopPropagation()
                      console.log('📋 LIST VIEW MEMORY CLICK:', memory.title, 'onMemoryClick available:', !!onMemoryClick)
                      onMemoryClick?.(memory)
                    }}
                  >
                    {thumbnail ? (
                      <img 
                        src={thumbnail} 
                        alt={memory.title || 'Memory'} 
                        className="w-12 h-12 object-cover rounded-lg shadow-sm flex-shrink-0" 
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                        <span className="text-slate-600 text-sm font-bold">{memory.title?.charAt(0) || 'M'}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm truncate">{memory.title || 'Untitled Memory'}</p>
                      {memory.createdAt && (
                        <p className="text-xs text-slate-500 mt-1">{new Date(memory.createdAt).toLocaleDateString()}</p>
                      )}
                      {memory.textContent && (
                        <p className="text-xs text-slate-600 mt-1 truncate">{memory.textContent}</p>
                      )}
                    </div>
                  </div>
                )
              })}
              {memories.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <div className="text-2xl mb-2">📝</div>
                  <p className="text-sm">No memories in this chapter yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Chapter title below globe with view toggle - positioned to avoid overlap */}
      <div className="absolute -bottom-28 left-1/2 transform -translate-x-1/2 text-center z-10 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg border border-white/50">
        <h4 className="font-bold text-slate-900 text-sm mb-1">{chapterTitle}</h4>
        {getYearRange() && (
          <p className="text-xs text-blue-600 font-medium mb-1">
            {getYearRange()}
          </p>
        )}
        <p className="text-xs text-slate-600 mb-2">
          {memories.length} {memories.length === 1 ? 'memory' : 'memories'}
        </p>
        
        {/* Add Memory Button */}
        {onAddMemory && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAddMemory(chapter?.id, chapterTitle)
            }}
            className="mb-2 bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5 mx-auto"
            title={`Add new memory to ${chapterTitle}`}
          >
            <span className="text-sm">+</span>
            <span>Add to Chapter</span>
          </button>
        )}
        

      </div>
      
      {/* Enhanced CSS Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { 
            transform: translateY(0px) rotateX(0deg) rotateY(0deg); 
          }
          25% { 
            transform: translateY(-8px) rotateX(5deg) rotateY(5deg); 
          }
          50% { 
            transform: translateY(0px) rotateX(0deg) rotateY(10deg); 
          }
          75% { 
            transform: translateY(8px) rotateX(-5deg) rotateY(5deg); 
          }
        }
      `}</style>
    </div>
  )
}