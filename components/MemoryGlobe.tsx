'use client'

import React, { useState, useEffect, useRef } from 'react'
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
}

function FloatingMemory({ memory, position, index, globeHovered, rotationX, rotationY }: FloatingMemoryProps) {
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
  
  // Individual hover makes memory much larger and prominent
  const finalScale = individualHover ? scale * 2.5 : globeHovered ? scale * 1.4 : scale * 0.8
  const finalOpacity = individualHover ? 1 : globeHovered ? opacity : Math.max(0.3, opacity * 0.7)

  // Hide memories that are too far behind the sphere
  if (rotatedPosition.z < -120) {
    return null
  }

  return (
    <div
      className="absolute transition-all duration-200 cursor-pointer group"
      style={{
        left: `calc(50% + ${rotatedPosition.x}px)`,
        top: `calc(50% + ${rotatedPosition.y}px)`,
        transform: `translate(-50%, -50%) scale(${finalScale})`,
        opacity: finalOpacity,
        filter: `blur(${blur}px) brightness(${0.8 + depth * 0.4})`,
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
  const [rotationX, setRotationX] = useState(0)
  const [rotationY, setRotationY] = useState(0)
  const [isRotating, setIsRotating] = useState(false)
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

  // Auto-rotation when not being manually rotated
  useEffect(() => {
    if (!visible || isRotating) return
    
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
  }, [visible, isRotating])

  // Mouse interaction for manual rotation
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!globeRef.current) return
    
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

  if (!visible || memories.length === 0) {
    return null
  }

  return (
    <div className="w-72 h-72 relative pointer-events-auto">
      {/* Extended hover zone with rotation interaction */}
      <div 
        className="absolute inset-0 rounded-full cursor-grab active:cursor-grabbing"
        onMouseEnter={() => setGlobeHovered(true)}
        onMouseLeave={() => {
          setGlobeHovered(false)
          handleMouseLeave()
        }}
        onMouseMove={handleMouseMove}
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
              radial-gradient(circle at ${30 + rotationY * 20}% ${30 + rotationX * 20}%, rgba(255,255,255,0.4) 0%, transparent 50%),
              radial-gradient(circle at ${70 - rotationY * 10}% ${70 - rotationX * 10}%, rgba(59,130,246,0.15) 0%, transparent 50%),
              linear-gradient(135deg, rgba(147,197,253,0.25) 0%, rgba(59,130,246,0.15) 50%, rgba(147,51,234,0.2) 100%)
            `,
            border: '2px solid rgba(59,130,246,0.4)',
            boxShadow: `
              inset 0 0 60px rgba(255,255,255,0.15),
              0 0 60px rgba(59,130,246,0.25),
              0 20px 40px rgba(0,0,0,0.15)
            `,
            backdropFilter: 'blur(12px)',
            transform: `scale(${globeHovered ? 1.02 : 1}) rotateX(${rotationX * 0.1}rad) rotateY(${rotationY * 0.1}rad)`,
            transformStyle: 'preserve-3d'
          }}
        >
          {/* Multiple depth layers for 3D effect - also rotate */}
          <div 
            className="absolute inset-4 rounded-full border border-blue-300/25 bg-gradient-to-br from-white/8 to-transparent"
            style={{
              transform: `rotateX(${rotationX * 0.05}rad) rotateY(${rotationY * 0.05}rad)`
            }}
          ></div>
          <div 
            className="absolute inset-8 rounded-full border border-blue-300/20"
            style={{
              transform: `rotateX(${rotationX * 0.03}rad) rotateY(${rotationY * 0.03}rad)`
            }}
          ></div>
          <div 
            className="absolute inset-12 rounded-full border border-blue-300/15"
            style={{
              transform: `rotateX(${rotationX * 0.02}rad) rotateY(${rotationY * 0.02}rad)`
            }}
          ></div>
          
          {/* Dynamic highlight sphere that moves with rotation */}
          <div 
            className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-white/25 to-transparent"
            style={{
              left: `${32 + rotationY * 15}%`,
              top: `${32 + rotationX * 15}%`,
              filter: 'blur(8px)',
              transform: `scale(${globeHovered ? 1.2 : 1})`,
              transition: 'transform 0.3s ease'
            }}
          ></div>
        </div>
        
        {/* Floating memories with 3D positioning and rotation */}
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
              rotationX={rotationX}
              rotationY={rotationY}
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