'use client'

import React, { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Sphere, Text, Html } from '@react-three/drei'
import { MemoryWithRelations } from '@/lib/types'
import * as THREE from 'three'

interface FloatingMemoryProps {
  memory: MemoryWithRelations
  position: [number, number, number]
  index: number
}

function FloatingMemory({ memory, position, index }: FloatingMemoryProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  
  // Get memory thumbnail
  const thumbnail = memory.media?.[0]?.storage_url || memory.media?.[0]?.thumbnail_url
  
  // Create texture from thumbnail
  const texture = useMemo(() => {
    if (!thumbnail) return null
    const loader = new THREE.TextureLoader()
    return loader.load(thumbnail)
  }, [thumbnail])

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle orbital motion
      const time = state.clock.getElapsedTime()
      const radius = 0.8 + Math.sin(time * 0.5 + index) * 0.1
      const speed = 0.3 + index * 0.1
      
      meshRef.current.position.x = position[0] + Math.sin(time * speed + index * 2) * 0.2
      meshRef.current.position.y = position[1] + Math.cos(time * speed * 0.7 + index * 3) * 0.15
      meshRef.current.position.z = position[2] + Math.sin(time * speed * 0.5 + index * 4) * 0.1
      
      // Gentle rotation
      meshRef.current.rotation.x += 0.01
      meshRef.current.rotation.y += 0.02
      
      // Scale on hover
      const targetScale = hovered ? 1.2 : 1
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1)
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <planeGeometry args={[0.15, 0.15]} />
      <meshLambertMaterial
        map={texture}
        transparent
        opacity={0.9}
        side={THREE.DoubleSide}
      />
      {!texture && (
        <meshLambertMaterial
          color="#3b82f6"
          transparent
          opacity={0.8}
        />
      )}
      
      {/* Memory title on hover */}
      {hovered && (
        <Html position={[0, 0.15, 0]} center>
          <div className="bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none">
            {memory.title || 'Memory'}
          </div>
        </Html>
      )}
    </mesh>
  )
}

function GlobeContainer({ memories }: { memories: MemoryWithRelations[] }) {
  const sphereRef = useRef<THREE.Mesh>(null)
  
  // Generate random positions inside sphere
  const memoryPositions = useMemo(() => {
    return memories.slice(0, 12).map(() => {
      // Generate random position inside sphere with radius 0.8
      const radius = Math.random() * 0.6 + 0.1
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      
      return [
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      ] as [number, number, number]
    })
  }, [memories])

  useFrame((state) => {
    if (sphereRef.current) {
      // Subtle globe rotation
      sphereRef.current.rotation.y += 0.005
    }
  })

  return (
    <>
      {/* Glass sphere container */}
      <Sphere ref={sphereRef} args={[1, 32, 32]}>
        <meshPhysicalMaterial
          transparent
          opacity={0.15}
          transmission={0.9}
          roughness={0.1}
          metalness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.1}
          color="#ffffff"
        />
      </Sphere>
      
      {/* Wireframe sphere for subtle structure */}
      <Sphere args={[1.01, 16, 16]}>
        <meshBasicMaterial
          color="#60a5fa"
          wireframe
          transparent
          opacity={0.1}
        />
      </Sphere>
      
      {/* Floating memories */}
      {memories.slice(0, 12).map((memory, index) => (
        <FloatingMemory
          key={memory.id}
          memory={memory}
          position={memoryPositions[index]}
          index={index}
        />
      ))}
      
      {/* Ambient interior lighting */}
      <pointLight position={[0, 0, 0]} intensity={0.5} color="#ffffff" />
      <ambientLight intensity={0.3} />
    </>
  )
}

interface MemoryGlobeProps {
  memories: MemoryWithRelations[]
  chapterTitle: string
  visible: boolean
}

export default function MemoryGlobe({ memories, chapterTitle, visible }: MemoryGlobeProps) {
  if (!visible || memories.length === 0) {
    return null
  }

  return (
    <div className="w-64 h-64 relative">
      <Canvas
        camera={{ position: [0, 0, 3], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        <GlobeContainer memories={memories} />
      </Canvas>
      
      {/* Chapter title below globe */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
        <h4 className="font-bold text-slate-900 text-sm">{chapterTitle}</h4>
        <p className="text-xs text-slate-600">
          {memories.length} {memories.length === 1 ? 'memory' : 'memories'}
        </p>
      </div>
    </div>
  )
}