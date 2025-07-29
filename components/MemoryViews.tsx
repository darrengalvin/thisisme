'use client'

import { useState } from 'react'
import { LayoutGrid, Clock, List, Filter } from 'lucide-react'
import { MemoryWithRelations } from '@/lib/types'
import MemoryFeed from './MemoryFeed'
import TimelineView from './TimelineView'
import MemoryGrid from './MemoryGrid'

interface MemoryViewsProps {
  memories: MemoryWithRelations[]
  birthYear?: number
  onEdit?: (memory: MemoryWithRelations) => void
  onDelete?: (memory: MemoryWithRelations) => void
  onStartCreating?: () => void
}

type ViewType = 'timeline' | 'grid' | 'list'

export default function MemoryViews({ memories, birthYear, onEdit, onDelete, onStartCreating }: MemoryViewsProps) {
  const [currentView, setCurrentView] = useState<ViewType>('timeline')
  const [showFilters, setShowFilters] = useState(false)

  const renderView = () => {
    switch (currentView) {
      case 'timeline':
        return <TimelineView memories={memories} birthYear={birthYear} onEdit={onEdit} onDelete={onDelete} onStartCreating={onStartCreating} />
      case 'grid':
        return <MemoryGrid memories={memories} onEdit={onEdit} onDelete={onDelete} onStartCreating={onStartCreating} />
      case 'list':
        return <MemoryFeed memories={memories} onEdit={onEdit} onDelete={onDelete} onStartCreating={onStartCreating} />
      default:
        return <TimelineView memories={memories} birthYear={birthYear} onEdit={onEdit} onDelete={onDelete} onStartCreating={onStartCreating} />
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* View Controls */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-4 lg:px-8 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentView('timeline')}
              className={`p-3 rounded-xl transition-all duration-200 ${
                currentView === 'timeline'
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Timeline View"
            >
              <Clock size={20} />
            </button>
            <button
              onClick={() => setCurrentView('grid')}
              className={`p-3 rounded-xl transition-all duration-200 ${
                currentView === 'grid'
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Grid View"
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setCurrentView('list')}
              className={`p-3 rounded-xl transition-all duration-200 ${
                currentView === 'list'
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="List View"
            >
              <List size={20} />
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-xl transition-all duration-200 ${
                showFilters
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="Filters"
            >
              <Filter size={20} />
            </button>
          </div>
        </div>

        {/* View Labels */}
        <div className="mt-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 capitalize">
              {currentView} View
            </h3>
            <p className="text-sm text-gray-600">
              {memories.length} memor{memories.length !== 1 ? 'ies' : 'y'}
            </p>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <button className="btn-outline text-sm py-2">All Chapters</button>
              <button className="btn-outline text-sm py-2">This Week</button>
              <button className="btn-outline text-sm py-2">With Media</button>
              <button className="btn-outline text-sm py-2">Text Only</button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {renderView()}
      </div>
    </div>
  )
} 