'use client'

import React, { useState, useEffect, useRef } from 'react'
import { MemoryWithRelations } from '@/lib/types'

interface FloatingMemoryProps {
  memory: MemoryWithRelations
  position: { x: number; y: number; z: number; scale: number }
  index: number
  globeHovered: boolean
}

function FloatingMemory({ memory, position, index, globeHovered }: FloatingMemoryProps) {
  const [individualHover, setIndividualHover] = useState(false)
  
  // Get memory thumbnail
  const thumbnail = memory.media?.[0]?.storage_url || memory.media?.[0]?.thumbnail_url
  
  // Calculate 3D-like positioning and scaling based on Z position
  const depth = (position.z + 100) / 200 // Normalize z to 0-1
  const scale = 0.4 + (depth * 0.8) // Scale from 0.4 to 1.2 based on depth
  const opacity = 0.3 + (depth * 0.7) // Opacity from 0.3 to 1.0
  const blur = Math.max(0, (1 - depth) * 2) // Blur background memories
  
  // Individual hover makes memory much larger and prominent
  const finalScale = individualHover ? scale * 2.5 : globeHovered ? scale * 1.5 : scale * 0.8
  const finalOpacity = individualHover ? 1 : globeHovered ? opacity : 0.4

  return (
    <div
      className="absolute transition-all duration-300 cursor-pointer group"
      style={{
        left: `calc(50% + ${position.x}px)`,
        top: `calc(50% + ${position.y}px)`,
        transform: `translate(-50%, -50%) scale(${finalScale})`,
        opacity: finalOpacity,
        filter: `blur(${blur}px)`,
        zIndex: Math.floor(depth * 100) + (individualHover ? 1000 : 0),
        width: '48px',
        height: '48px',
        animationDelay: `${index * 0.3}s`
      }}
      onMouseEnter={() => setIndividualHover(true)}
      onMouseLeave={() => setIndividualHover(false)}
    >
      {thumbnail ? (
        <img
          src={thumbnail}
          alt={memory.title || 'Memory'}
          className="w-full h-full object-cover rounded-lg border-2 border-white shadow-2xl"
          style={{
            filter: individualHover ? 'brightness(1.1) contrast(1.1)' : 'none'
          }}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg border-2 border-white shadow-2xl flex items-center justify-center">
          <span className="text-white text-sm font-bold">
            {memory.title?.charAt(0) || 'M'}
          </span>
        </div>
      )}
      
      {/* Enhanced memory tooltip on individual hover */}
      {individualHover && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-black/95 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap pointer-events-none z-50 min-w-max">
          <div className="font-semibold">{memory.title || 'Memory'}</div>
          {memory.createdAt && (
            <div className="text-xs opacity-75">
              {new Date(memory.createdAt).toLocaleDateString()}
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
}

export default function MemoryGlobe({ memories, chapterTitle, visible }: MemoryGlobeProps) {
  const [memoryPositions, setMemoryPositions] = useState<Array<{
    x: number
    y: number
    z: number
    scale: number
  }>>([])
  const [globeHovered, setGlobeHovered] = useState(false)
  const globeRef = useRef<HTMLDivElement>(null)

  // Generate 3D positions when component mounts or memories change
  useEffect(() => {
    if (memories.length === 0) return
    
    const positions = memories.slice(0, 15).map((_, index) => {
      // Create 3D sphere distribution
      const phi = Math.acos(1 - 2 * Math.random()) // Random phi (0 to π)
      const theta = Math.random() * 2 * Math.PI // Random theta (0 to 2π)
      const radius = 80 + Math.random() * 60 // Radius from center (80-140px)
      
      // Convert spherical to Cartesian coordinates
      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.sin(phi) * Math.sin(theta)
      const z = radius * Math.cos(phi)
      
      return {
        x: x * 0.8, // Flatten X slightly for better visibility
        y: y * 0.6, // Flatten Y more for better visibility
        z: z, // Keep full Z for depth effect
        scale: 0.8 + Math.random() * 0.4 // Random scale variation
      }
    })
    
    setMemoryPositions(positions)
  }, [memories])

  if (!visible || memories.length === 0) {
    return null
  }

  return (
    <div className="w-80 h-80 relative pointer-events-auto">
      {/* Extended hover zone - much larger than visual globe */}
      <div 
        className="absolute inset-0 rounded-full cursor-pointer"
        onMouseEnter={() => setGlobeHovered(true)}
        onMouseLeave={() => setGlobeHovered(false)}
        style={{ 
          padding: '40px', // Extends hover zone beyond visual boundary
          margin: '-40px' // Negative margin to maintain positioning
        }}
      >
        {/* Glass sphere container with enhanced 3D effects */}
        <div 
          ref={globeRef}
          className="absolute inset-12 rounded-full transition-all duration-500"
          style={{
            background: `
              radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 50%),
              radial-gradient(circle at 70% 70%, rgba(59,130,246,0.1) 0%, transparent 50%),
              linear-gradient(135deg, rgba(147,197,253,0.2) 0%, rgba(59,130,246,0.1) 50%, rgba(147,51,234,0.15) 100%)
            `,
            border: '2px solid rgba(59,130,246,0.3)',
            boxShadow: `
              inset 0 0 60px rgba(255,255,255,0.1),
              0 0 60px rgba(59,130,246,0.2),
              0 20px 40px rgba(0,0,0,0.1)
            `,
            backdropFilter: 'blur(10px)',
            transform: globeHovered ? 'scale(1.05)' : 'scale(1)',
          }}
        >
          {/* Multiple depth layers for 3D effect */}
          <div className="absolute inset-4 rounded-full border border-blue-300/20 bg-gradient-to-br from-white/5 to-transparent"></div>
          <div className="absolute inset-8 rounded-full border border-blue-300/15"></div>
          <div className="absolute inset-12 rounded-full border border-blue-300/10"></div>
          
          {/* Highlight sphere for extra 3D depth */}
          <div 
            className="absolute top-8 left-8 w-16 h-16 rounded-full bg-gradient-to-br from-white/20 to-transparent"
            style={{
              filter: 'blur(8px)',
              transform: globeHovered ? 'scale(1.2)' : 'scale(1)',
              transition: 'transform 0.3s ease'
            }}
          ></div>
        </div>
        
        {/* Floating memories with 3D positioning */}
        {memories.slice(0, 15).map((memory, index) => {
          const position = memoryPositions[index]
          if (!position) return null
          
          return (
            <FloatingMemory
              key={memory.id}
              memory={memory}
              position={position}
              index={index}
              globeHovered={globeHovered}
            />
          )
        })}
      </div>
      
      {/* Chapter title below globe */}
      <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-center">
        <h4 className="font-bold text-slate-900 text-base">{chapterTitle}</h4>
        <p className="text-sm text-slate-600">
          {memories.length} {memories.length === 1 ? 'memory' : 'memories'}
        </p>
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