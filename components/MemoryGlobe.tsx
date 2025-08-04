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
  
  // Individual hover extracts memory from the globe - larger but not too big to block others
  const finalScale = individualHover ? 2.2 : globeHovered ? scale * 1.4 : scale * 0.8
  const finalOpacity = individualHover ? 1 : globeHovered ? opacity : Math.max(0.3, opacity * 0.7)
  const finalBlur = individualHover ? 0 : blur // No blur when extracted from globe

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
        filter: `blur(${finalBlur}px) brightness(${individualHover ? 1.2 : 0.8 + depth * 0.4})`,
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
      
      {/* Memory tooltip on individual hover */}
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
  chapterColor?: { hue: number; saturation: number; lightness: number }
  is3DMode?: boolean
}

export default function MemoryGlobe({ memories, chapterTitle, visible, chapterColor, is3DMode = true }: MemoryGlobeProps) {
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

  // Use chapter color or default blue
  const color = chapterColor || { hue: 213, saturation: 75, lightness: 60 }
  
  // If not in 3D mode, show simple list view
  if (!is3DMode) {
    return (
      <div className="w-72 bg-white rounded-xl shadow-lg border border-slate-200 p-4 pointer-events-auto">
        <h4 className="font-bold text-slate-900 text-base mb-3">{chapterTitle}</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {memories.slice(0, 8).map((memory, index) => {
            const thumbnail = memory.media?.[0]?.storage_url || memory.media?.[0]?.thumbnail_url
            return (
              <div key={memory.id} className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                {thumbnail ? (
                  <img src={thumbnail} alt={memory.title || 'Memory'} className="w-10 h-10 object-cover rounded-lg" />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg flex items-center justify-center">
                    <span className="text-slate-500 text-xs font-bold">{memory.title?.charAt(0) || 'M'}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm truncate">{memory.title || 'Memory'}</p>
                  {memory.createdAt && (
                    <p className="text-xs text-slate-500">{new Date(memory.createdAt).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            )
          })}
          {memories.length > 8 && (
            <div className="text-center py-2">
              <span className="text-sm text-slate-500">+{memories.length - 8} more memories</span>
            </div>
          )}
        </div>
      </div>
    )
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
        {/* 3D Sphere with proper sphere lighting and surface */}
        <div 
          ref={globeRef}
          className="absolute inset-12 rounded-full transition-all duration-500"
          style={{
            background: `
              radial-gradient(ellipse 120% 60% at ${30 + Math.cos(rotationY) * 20}% ${35 + Math.sin(rotationX) * 15}%, 
                hsla(${color.hue}, ${color.saturation}%, ${Math.min(90, color.lightness + 30)}%, 0.95) 0%, 
                hsla(${color.hue}, ${color.saturation}%, ${color.lightness + 15}%, 0.9) 25%, 
                hsla(${color.hue}, ${color.saturation}%, ${color.lightness}%, 0.8) 50%, 
                hsla(${color.hue}, ${color.saturation}%, ${color.lightness - 10}%, 0.85) 75%, 
                hsla(${color.hue}, ${color.saturation}%, ${color.lightness - 20}%, 0.95) 100%)
            `,
            border: `2px solid hsla(${color.hue}, ${color.saturation}%, ${color.lightness - 20}%, 0.6)`,
            boxShadow: `
              inset ${-30 + Math.cos(rotationY) * 50}px ${-20 + Math.sin(rotationX) * 40}px 60px rgba(255,255,255,0.7),
              inset ${30 - Math.cos(rotationY) * 50}px ${20 - Math.sin(rotationX) * 40}px 80px rgba(0,0,0,0.6),
              0 0 40px rgba(0,0,0,0.3),
              0 15px 30px rgba(0,0,0,0.4)
            `,
            transform: `scale(${globeHovered ? 1.05 : 1}) 
                       perspective(1000px) 
                       rotateX(${rotationX * 15}deg) 
                       rotateY(${rotationY * 15}deg)`,
            transformStyle: 'preserve-3d'
          }}
        >
          {/* Simple rotating surface pattern */}
          <div 
            className="absolute inset-2 rounded-full overflow-hidden"
            style={{
              background: `
                conic-gradient(from ${rotationY * 180}deg at 50% 50%, 
                  transparent 0deg, 
                  hsla(${color.hue}, ${color.saturation}%, ${color.lightness - 10}%, 0.15) 90deg, 
                  transparent 180deg, 
                  hsla(${color.hue}, ${color.saturation}%, ${color.lightness - 10}%, 0.15) 270deg, 
                  transparent 360deg)
              `,
              transform: `rotateY(${rotationY * 60}deg) rotateX(${rotationX * 40}deg)`,
              opacity: 0.6
            }}
          ></div>
          
          {/* Main highlight that moves across the sphere surface */}
          <div 
            className="absolute rounded-full"
            style={{
              width: `${80 + Math.cos(rotationY) * 20}px`,
              height: `${60 + Math.sin(rotationX) * 15}px`,
              left: `${40 + Math.cos(rotationY) * 25}%`,
              top: `${30 + Math.sin(rotationX) * 20}%`,
              background: `radial-gradient(ellipse 70% 50% at 50% 40%, 
                rgba(255,255,255,0.8) 0%, 
                rgba(255,255,255,0.4) 30%, 
                rgba(255,255,255,0.1) 60%, 
                transparent 100%)`,
              filter: 'blur(8px)',
              transform: `
                scale(${globeHovered ? 1.2 : 1}) 
                rotateY(${rotationY * 20}deg) 
                rotateX(${rotationX * 15}deg)
                scaleX(${0.7 + Math.abs(Math.cos(rotationY)) * 0.6})
              `,
              transition: 'transform 0.2s ease'
            }}
          ></div>
          
          {/* Secondary highlight for more realistic lighting */}
          <div 
            className="absolute rounded-full"
            style={{
              width: '40px',
              height: '30px',
              left: `${35 + Math.cos(rotationY + 0.5) * 30}%`,
              top: `${40 + Math.sin(rotationX + 0.3) * 25}%`,
              background: `radial-gradient(ellipse, 
                rgba(255,255,255,0.6) 0%, 
                rgba(255,255,255,0.2) 50%, 
                transparent 80%)`,
              filter: 'blur(4px)',
              transform: `rotateY(${rotationY * 45}deg) rotateX(${rotationX * 30}deg)`
            }}
          ></div>
          
          {/* Shadow regions that make the sphere look 3D */}
          <div 
            className="absolute inset-1 rounded-full"
            style={{
              background: `
                radial-gradient(ellipse 90% 120% at ${70 - Math.cos(rotationY) * 30}% ${60 - Math.sin(rotationX) * 25}%, 
                  transparent 0%, 
                  transparent 20%, 
                  rgba(0,0,0,0.15) 40%, 
                  rgba(0,0,0,0.35) 70%, 
                  rgba(0,0,0,0.6) 100%),
                radial-gradient(ellipse 70% 100% at ${25 + Math.cos(rotationY) * 20}% ${35 + Math.sin(rotationX) * 15}%, 
                  rgba(0,0,0,0.4) 0%, 
                  rgba(0,0,0,0.2) 30%, 
                  transparent 60%)
              `,
              transform: `rotateY(${-rotationY * 10}deg) rotateX(${-rotationX * 8}deg)`
            }}
          ></div>
          
          {/* Edge darkening to simulate sphere curvature */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: `
                radial-gradient(ellipse 85% 85% at 50% 50%, 
                  transparent 0%, 
                  transparent 60%, 
                  rgba(0,0,0,0.2) 80%, 
                  rgba(0,0,0,0.5) 95%, 
                  rgba(0,0,0,0.8) 100%)
              `,
              transform: `rotateY(${rotationY * 5}deg) rotateX(${rotationX * 5}deg)`
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
      
      {/* Chapter title below globe - positioned to avoid overlap with card */}
      <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center z-10">
        <h4 className="font-bold text-slate-900 text-base drop-shadow-sm">{chapterTitle}</h4>
        <p className="text-sm text-slate-600 drop-shadow-sm">
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