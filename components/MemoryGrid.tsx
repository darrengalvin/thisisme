'use client'

import { useState } from 'react'
import { Clock, Users, Lock, Heart, MessageCircle } from 'lucide-react'
import { MemoryWithRelations } from '@/lib/types'
import { formatRelativeTime } from './utils'
import PhotoTagDisplay from './PhotoTagDisplay'

interface MemoryGridProps {
  memories: MemoryWithRelations[]
  onEdit?: (memory: MemoryWithRelations) => void
  onDelete?: (memory: MemoryWithRelations) => void
  onStartCreating?: () => void
}

export default function MemoryGrid({ memories, onEdit, onDelete, onStartCreating }: MemoryGridProps) {
  const [hoveredMemory, setHoveredMemory] = useState<string | null>(null)

  if (memories.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="container-responsive p-4 lg:p-8">
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">No memories yet!</p>
            <button
              onClick={onStartCreating}
              className="bg-primary-600 text-white px-6 py-2 rounded-full hover:bg-primary-700 transition-colors"
            >
              Create New Memory
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="container-responsive p-4 lg:p-8">
        {/* Masonry Grid */}
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
          {memories.map((memory) => (
            <div
              key={memory.id}
              className="break-inside-avoid mb-6"
              onMouseEnter={() => setHoveredMemory(memory.id)}
              onMouseLeave={() => setHoveredMemory(null)}
            >
              <div className="card group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                {/* Media Preview */}
                {memory.media && memory.media.length > 0 && (
                  <div className="relative overflow-hidden rounded-t-2xl">
                    {memory.media[0].type === 'IMAGE' && (
                      <PhotoTagDisplay
                        mediaId={memory.media[0].id}
                        imageUrl={memory.media[0].storage_url}
                        className="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-110"
                        showTagsOnHover={true}
                        showTagIndicator={true}
                        onPersonClick={(personId, personName) => {
                          console.log('🏷️ MEMORY GRID: Person clicked:', personName, personId)
                          // TODO: Navigate to My People or show person details
                        }}
                      />
                    )}
                    {memory.media[0].type === 'VIDEO' && (
                      <div className="relative">
                        <video
                          src={memory.media[0].storage_url}
                          className="w-full h-auto object-cover"
                          poster={memory.media[0].thumbnail_url || undefined}
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                            <span className="text-xl">▶️</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {memory.media[0].type === 'AUDIO' && (
                      <div className="h-32 bg-primary-100 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-2">
                            <span className="text-white text-xl">🎵</span>
                          </div>
                          <p className="text-sm text-primary-700 font-medium">Audio Memory</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Media Count Badge */}
                    {memory.media.length > 1 && (
                      <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                        +{memory.media.length - 1}
                      </div>
                    )}

                    {/* Hover Overlay */}
                    {hoveredMemory === memory.id && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="text-white text-center">
                          <p className="text-sm font-medium">Click to view</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="p-4">
                  {/* Time Zone & Time */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {memory.timeZone && (
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          {memory.timeZone.type === 'PRIVATE' ? (
                            <Lock size={12} />
                          ) : (
                            <Users size={12} />
                          )}
                          <span className="font-medium">{memory.timeZone.title}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(memory.createdAt)}
                    </span>
                  </div>

                  {/* Title */}
                  {memory.title && (
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {memory.title}
                    </h3>
                  )}

                  {/* Text Content */}
                  {memory.textContent && (
                    <p className="text-gray-700 text-sm line-clamp-4 mb-3 leading-relaxed">
                      {memory.textContent}
                    </p>
                  )}

                  {/* Actions - Show on hover */}
                  {hoveredMemory === memory.id && (
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center space-x-3">
                        <button className="flex items-center space-x-1 text-gray-500 hover:text-red-500 transition-colors">
                          <Heart size={16} />
                          <span className="text-xs">Like</span>
                        </button>
                        <button className="flex items-center space-x-1 text-gray-500 hover:text-primary-600 transition-colors">
                          <MessageCircle size={16} />
                          <span className="text-xs">Comment</span>
                        </button>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => onEdit?.(memory)}
                          className="p-2 text-gray-500 hover:text-primary-600 transition-colors"
                        >
                          <span className="text-xs">Edit</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 