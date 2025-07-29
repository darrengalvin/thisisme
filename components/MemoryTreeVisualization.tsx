'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, Heart, Star, MapPin, Users, Book, Briefcase, Home, GraduationCap, Car, Plane, Plus } from 'lucide-react'
import { MemoryWithRelations } from '@/lib/types'

interface MemoryTreeVisualizationProps {
  memories?: MemoryWithRelations[]
  onMemorySelect?: (memory: any) => void
}

export default function MemoryTreeVisualization({ memories = [], onMemorySelect }: MemoryTreeVisualizationProps) {
  const [selectedMemory, setSelectedMemory] = useState<any>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  // Sample demo data if no memories provided
  const demoMemories = [
    { id: 'demo-1', age: 0, title: "Welcome to Memory Tree", date: "2024-01-15", type: "milestone", icon: "heart", description: "Started your memory journey", branch: "main", year: 2024 },
    { id: 'demo-2', age: 1, title: "First Memory Added", date: "2024-01-16", type: "achievement", icon: "star", description: "Added your first precious memory", branch: "left", year: 2024 },
    { id: 'demo-3', age: 2, title: "Building Your Collection", date: "2024-01-17", type: "milestone", icon: "book", description: "Your memory collection starts to take shape", branch: "right", year: 2024 },
    { id: 'demo-4', age: 3, title: "Shared Memories", date: "2024-01-18", type: "relationship", icon: "users", description: "Connected with loved ones through shared stories", branch: "left", year: 2024 },
    { id: 'demo-5', age: 4, title: "Life Milestones", date: "2024-01-19", type: "education", icon: "graduation", description: "Captured important achievements", branch: "right", year: 2024 },
    { id: 'demo-6', age: 5, title: "Travel Adventures", date: "2024-01-20", type: "travel", icon: "plane", description: "Adventures and journeys remembered", branch: "main", year: 2024 }
  ]

  const memoryData = memories.length > 0 ? memories.map((m, i) => ({
    id: m.id,
    age: i,
    title: m.title || 'Untitled Memory',
    date: m.createdAt,
    type: 'milestone',
    icon: 'heart',
    description: m.textContent || 'A precious memory',
    branch: i % 3 === 0 ? 'main' : i % 2 === 0 ? 'left' : 'right',
    year: new Date(m.createdAt).getFullYear()
  })) : demoMemories

  const iconMap = {
    heart: Heart,
    book: Book,
    plane: Plane,
    users: Users,
    star: Star,
    briefcase: Briefcase,
    home: Home,
    calendar: Calendar,
    graduation: GraduationCap,
    car: Car
  }

  const typeColors = {
    milestone: "#e74c3c",
    education: "#2563eb",
    travel: "#059669",
    relationship: "#dc2626",
    achievement: "#d97706",
    work: "#7c3aed"
  }

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const { width, height } = svgRef.current.getBoundingClientRect()
        setDimensions({ width: Math.max(width, 400), height: Math.max(height, 400) })
      }
    }
    
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  const calculateNodePosition = (memory: any, index: number) => {
    const centerX = dimensions.width / 2
    const startY = dimensions.height - 80
    const endY = 120
    const treeHeight = startY - endY
    
    // Calculate vertical position
    const progress = index / Math.max(memoryData.length - 1, 1)
    const y = startY - (progress * treeHeight)
    
    // Calculate horizontal position with organic branching
    let x = centerX
    const branchSpread = Math.min(120, dimensions.width / 6)
    
    if (memory.branch === 'left') {
      x = centerX - branchSpread * (0.3 + progress * 0.7)
      x += Math.sin(progress * Math.PI * 3) * 15
    } else if (memory.branch === 'right') {
      x = centerX + branchSpread * (0.3 + progress * 0.7)
      x += Math.cos(progress * Math.PI * 3) * 15
    } else {
      // Main branch with subtle organic movement
      x = centerX + Math.sin(progress * Math.PI * 6) * 8
    }
    
    return { x, y }
  }

  const drawBranches = () => {
    const paths = []
    const centerX = dimensions.width / 2
    const startY = dimensions.height - 80
    
    // Main trunk with organic curve
    const trunkPath = `M ${centerX} ${startY} 
                       Q ${centerX + 5} ${startY - 80} 
                       ${centerX - 5} ${startY - 160}
                       Q ${centerX + 8} ${startY - 240}
                       ${centerX} ${120}`
    
    paths.push(
      <path
        key="trunk"
        d={trunkPath}
        stroke="url(#trunkGradient)"
        strokeWidth="6"
        fill="none"
        className="drop-shadow-sm"
      />
    )
    
    // Connect memories with elegant curves
    memoryData.forEach((memory, index) => {
      if (index > 0) {
        const currentPos = calculateNodePosition(memory, index)
        const prevPos = calculateNodePosition(memoryData[index - 1], index - 1)
        
        const midX = (currentPos.x + prevPos.x) / 2
        const midY = prevPos.y - 30
        
        const branchPath = `M ${prevPos.x} ${prevPos.y} 
                           Q ${midX} ${midY} 
                           ${currentPos.x} ${currentPos.y}`
        
        paths.push(
          <path
            key={`branch-${memory.id}`}
            d={branchPath}
            stroke="url(#branchGradient)"
            strokeWidth="2"
            fill="none"
            className="opacity-60"
          />
        )
      }
    })
    
    return paths
  }

  const handleMemoryClick = (memory: any) => {
    setSelectedMemory(memory)
    onMemorySelect?.(memory)
  }

  const MemoryNode = ({ memory, position, index }: { memory: any, position: { x: number, y: number }, index: number }) => {
    const IconComponent = iconMap[memory.icon as keyof typeof iconMap] || Heart
    const isHovered = hoveredNode === memory.id
    const isSelected = selectedMemory?.id === memory.id
    const nodeColor = typeColors[memory.type as keyof typeof typeColors] || typeColors.milestone
    
    return (
      <g
        transform={`translate(${position.x}, ${position.y})`}
        onClick={() => handleMemoryClick(memory)}
        onMouseEnter={() => setHoveredNode(memory.id)}
        onMouseLeave={() => setHoveredNode(null)}
        style={{ cursor: 'pointer' }}
        className="transition-all duration-300"
      >
        {/* Glow effect */}
        {(isHovered || isSelected) && (
          <>
            <circle
              r="35"
              fill={nodeColor}
              opacity="0.15"
              className="animate-pulse"
            />
            <circle
              r="28"
              fill={nodeColor}
              opacity="0.25"
            />
          </>
        )}
        
        {/* Main node circle */}
        <circle
          r="22"
          fill={nodeColor}
          stroke="white"
          strokeWidth="3"
          className={`transition-all duration-300 ${
            isHovered || isSelected ? 'brightness-110 scale-110' : ''
          } drop-shadow-lg`}
          style={{
            filter: isHovered || isSelected ? 'brightness(1.1)' : 'none'
          }}
        />
        
        {/* Icon */}
        <IconComponent
          size={18}
          color="white"
          style={{ 
            transform: 'translate(-9px, -9px)',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
          }}
        />
        
        {/* Memory index */}
        <circle
          cx="18"
          cy="-18"
          r="12"
          fill="white"
          stroke={nodeColor}
          strokeWidth="2"
          className="drop-shadow-sm"
        />
        <text
          x="18"
          y="-14"
          textAnchor="middle"
          className="text-xs font-bold fill-gray-700"
        >
          {index + 1}
        </text>
        
        {/* Hover tooltip */}
        {isHovered && !isSelected && (
          <g className="animate-fadeIn">
            <rect
              x="-80"
              y="-60"
              width="160"
              height="32"
              fill="rgba(0,0,0,0.85)"
              rx="8"
              className="drop-shadow-lg"
            />
            <text
              y="-48"
              textAnchor="middle"
              className="text-sm font-medium fill-white"
            >
              {memory.title}
            </text>
            <text
              y="-34"
              textAnchor="middle"
              className="text-xs fill-gray-300"
            >
              {new Date(memory.date).toLocaleDateString()}
            </text>
          </g>
        )}
      </g>
    )
  }

  return (
    <div className="w-full h-full flex">
      {/* Tree Visualization */}
      <div className="flex-1 bg-gradient-to-br from-emerald-50 to-green-100 rounded-2xl shadow-lg overflow-hidden border border-emerald-200">
        <div className="p-4 border-b border-emerald-200 bg-white/50 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-emerald-800 flex items-center space-x-2">
            <span className="text-2xl">🌳</span>
            <span>Your Memory Tree</span>
          </h3>
          <div className="text-center text-sm text-gray-600 mt-4">
            {memoryData.length} memories in your tree
          </div>
        </div>
        
        <div className="relative h-full">
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            className="overflow-visible"
          >
            {/* Gradients */}
            <defs>
              <radialGradient id="bgGradient" cx="50%" cy="100%">
                <stop offset="0%" stopColor="rgba(16, 185, 129, 0.1)" />
                <stop offset="50%" stopColor="rgba(5, 150, 105, 0.05)" />
                <stop offset="100%" stopColor="rgba(6, 78, 59, 0.02)" />
              </radialGradient>
              <linearGradient id="trunkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#8B4513" />
                <stop offset="50%" stopColor="#A0522D" />
                <stop offset="100%" stopColor="#654321" />
              </linearGradient>
              <linearGradient id="branchGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8B4513" />
                <stop offset="100%" stopColor="#A0522D" />
              </linearGradient>
            </defs>
            
            {/* Background */}
            <rect width="100%" height="100%" fill="url(#bgGradient)" />
            
            {/* Decorative leaves */}
            {[...Array(8)].map((_, i) => (
              <circle
                key={`leaf-${i}`}
                cx={50 + i * 100}
                cy={50 + (i % 3) * 100}
                r="3"
                fill="#22c55e"
                opacity="0.3"
                className="animate-pulse"
                style={{ animationDelay: `${i * 0.5}s` }}
              />
            ))}
            
            {/* Tree branches */}
            {drawBranches()}
            
            {/* Memory nodes */}
            {memoryData.map((memory, index) => {
              const position = calculateNodePosition(memory, index)
              return (
                <MemoryNode
                  key={memory.id}
                  memory={memory}
                  position={position}
                  index={index}
                />
              )
            })}
          </svg>
          
          {/* Floating Action Button */}
          <button
            onClick={() => onMemorySelect?.({ action: 'create' })}
            className="absolute bottom-6 right-6 p-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 z-10"
            title="Add new memory"
          >
            <Plus size={24} />
          </button>
        </div>
      </div>
      
      {/* Memory Details Panel */}
      {selectedMemory && (
        <div className="w-80 bg-white rounded-2xl shadow-lg ml-4 border border-emerald-200 overflow-hidden">
          <div className="p-6">
            <div
              className="w-full h-2 rounded-full mb-4"
              style={{ backgroundColor: typeColors[selectedMemory.type as keyof typeof typeColors] || typeColors.milestone }}
            />
            
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {selectedMemory.title}
                </h3>
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                  <Calendar size={14} />
                  <span>{new Date(selectedMemory.date).toLocaleDateString()}</span>
                </div>
              </div>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: typeColors[selectedMemory.type as keyof typeof typeColors] || typeColors.milestone }}
              >
                {(() => {
                  const IconComponent = iconMap[selectedMemory.icon as keyof typeof iconMap] || Heart
                  return <IconComponent size={20} color="white" />
                })()}
              </div>
            </div>
            
            <div className="flex items-center space-x-2 mb-4">
              <span
                className="px-3 py-1 rounded-full text-white text-sm font-medium"
                style={{ backgroundColor: typeColors[selectedMemory.type as keyof typeof typeColors] || typeColors.milestone }}
              >
                {selectedMemory.type}
              </span>
              <span className="text-sm text-gray-600">
                Memory #{memoryData.findIndex(m => m.id === selectedMemory.id) + 1}
              </span>
            </div>
            
            <p className="text-gray-700 leading-relaxed mb-6">
              {selectedMemory.description}
            </p>
            
            <div className="space-y-3">
              <button className="w-full bg-gradient-to-r from-emerald-600 to-green-700 text-white py-3 rounded-xl font-medium hover:from-emerald-700 hover:to-green-800 transition-all duration-200">
                View Full Memory
              </button>
              <button 
                onClick={() => setSelectedMemory(null)}
                className="w-full border-2 border-emerald-600 text-emerald-700 py-3 rounded-xl font-medium hover:bg-emerald-50 transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 