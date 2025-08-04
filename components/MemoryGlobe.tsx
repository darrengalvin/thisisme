'use client'

import React, { useState, useEffect } from 'react'
import { MemoryWithRelations } from '@/lib/types'

interface FloatingMemoryProps {
  memory: MemoryWithRelations
  style: React.CSSProperties
  delay: number
}

function FloatingMemory({ memory, style, delay }: FloatingMemoryProps) {
  const [hovered, setHovered] = useState(false)
  
  // Get memory thumbnail
  const thumbnail = memory.media?.[0]?.storage_url || memory.media?.[0]?.thumbnail_url

  return (
    <div
      className="absolute w-8 h-8 rounded transition-all duration-300 cursor-pointer group"
      style={{
        ...style,
        animationDelay: `${delay}s`,
        transform: `${style.transform} ${hovered ? 'scale(1.2)' : 'scale(1)'}`,
        zIndex: hovered ? 20 : 10
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {thumbnail ? (
        <img
          src={thumbnail}
          alt={memory.title || 'Memory'}
          className="w-full h-full object-cover rounded border-2 border-white shadow-lg"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 rounded border-2 border-white shadow-lg flex items-center justify-center">
          <span className="text-white text-xs font-bold">
            {memory.title?.charAt(0) || 'M'}
          </span>
        </div>
      )}
      
      {/* Memory tooltip on hover */}
      {hovered && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-30">
          {memory.title || 'Memory'}
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
    rotation: number
    animationDuration: number
  }>>([])

  // Generate positions when component mounts or memories change
  useEffect(() => {
    if (memories.length === 0) return
    
    const positions = memories.slice(0, 12).map((_, index) => {
      // Generate positions in a circular/spherical pattern
      const angle = (index / Math.min(memories.length, 12)) * Math.PI * 2
      const radius = 60 + Math.random() * 40 // 60-100px from center
      const x = Math.cos(angle) * radius + Math.random() * 20 - 10
      const y = Math.sin(angle) * radius + Math.random() * 20 - 10
      
      return {
        x,
        y,
        rotation: Math.random() * 360,
        animationDuration: 8 + Math.random() * 4 // 8-12s
      }
    })
    
    setMemoryPositions(positions)
  }, [memories])

  if (!visible || memories.length === 0) {
    return null
  }

  return (
    <div className="w-64 h-64 relative">
      {/* Glass sphere container */}
      <div className="absolute inset-4 rounded-full border-2 border-blue-200/30 bg-gradient-to-br from-blue-50/20 to-purple-50/20 backdrop-blur-sm shadow-2xl">
        {/* Inner glow effect */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/10 to-transparent"></div>
        
        {/* Wireframe grid overlay for 3D effect */}
        <div className="absolute inset-0 rounded-full border border-blue-300/20"></div>
        <div className="absolute inset-4 rounded-full border border-blue-300/15"></div>
        <div className="absolute inset-8 rounded-full border border-blue-300/10"></div>
        
        {/* Floating memories */}
        {memories.slice(0, 12).map((memory, index) => {
          const position = memoryPositions[index]
          if (!position) return null
          
          return (
            <FloatingMemory
              key={memory.id}
              memory={memory}
              delay={index * 0.2}
              style={{
                left: `calc(50% + ${position.x}px)`,
                top: `calc(50% + ${position.y}px)`,
                transform: `translate(-50%, -50%) rotate(${position.rotation}deg)`,
                animation: `float ${position.animationDuration}s infinite ease-in-out`
              }}
            />
          )
        })}
      </div>
      
      {/* Chapter title below globe */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
        <h4 className="font-bold text-slate-900 text-sm">{chapterTitle}</h4>
        <p className="text-xs text-slate-600">
          {memories.length} {memories.length === 1 ? 'memory' : 'memories'}
        </p>
      </div>
      
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { 
            transform: translate(-50%, -50%) rotate(0deg) translateY(0px); 
          }
          25% { 
            transform: translate(-50%, -50%) rotate(90deg) translateY(-5px); 
          }
          50% { 
            transform: translate(-50%, -50%) rotate(180deg) translateY(0px); 
          }
          75% { 
            transform: translate(-50%, -50%) rotate(270deg) translateY(5px); 
          }
        }
      `}</style>
    </div>
  )
}