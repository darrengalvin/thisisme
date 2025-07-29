'use client'

import { useState, useEffect, useRef } from 'react'
import { Calendar, Clock, Users, Lock, ChevronDown, ChevronUp, Plus, Camera, Heart, MessageCircle, Share, MapPin } from 'lucide-react'
import { MemoryWithRelations, TimeZoneWithRelations } from '@/lib/types'
import { formatDate, formatRelativeTime } from './utils'
import { useAuth } from './AuthProvider'

interface TimelineViewProps {
  memories: MemoryWithRelations[]
  birthYear?: number
  onEdit?: (memory: MemoryWithRelations) => void
  onDelete?: (memory: MemoryWithRelations) => void
  onStartCreating?: (chapterId?: string, chapterTitle?: string) => void
}

interface TimelineGroup {
  date: string
  label: string
  memories: MemoryWithRelations[]
}



export default function TimelineView({ memories, birthYear, onEdit, onDelete, onStartCreating }: TimelineViewProps) {
  const { user } = useAuth()
  const [chapters, setChapters] = useState<TimeZoneWithRelations[]>([])
  const [isLoadingChapters, setIsLoadingChapters] = useState(true)
  const [expandedMemory, setExpandedMemory] = useState<string | null>(null)

  const timelineRef = useRef<HTMLDivElement>(null)

  const currentYear = new Date().getFullYear()

  // Fetch chapters on component mount
  useEffect(() => {
    if (user) {
      fetchChapters()
    }
  }, [user])

  // Refetch chapters when memories change
  useEffect(() => {
    if (user) {
      console.log('🔄 TIMELINE VIEW: Refreshing chapters after memory change')
      fetchChapters()
    }
  }, [memories.length, user])

  // Debug logging
  useEffect(() => {
    console.log('🌟 TIMELINE VIEW: Data update -', memories.length, 'memories and', chapters.length, 'chapters')
    console.log('📊 TIMELINE VIEW MEMORIES:', memories.map(m => ({ 
      id: m.id, 
      title: m.title, 
      timeZoneId: m.timeZoneId 
    })))
    console.log('📁 TIMELINE VIEW CHAPTERS:', chapters.map(c => ({ 
      id: c.id, 
      title: c.title 
    })))
  }, [memories, chapters])

  const fetchChapters = async () => {
    try {
      if (!user) {
        console.log('❌ TIMELINE VIEW: No user, skipping chapter fetch')
        setIsLoadingChapters(false)
        return
      }

      console.log('🔑 TIMELINE VIEW: Getting auth token for user:', user.id)

      // Get custom JWT token for API
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      if (!tokenResponse.ok) {
        console.error('❌ TIMELINE VIEW: Failed to get auth token:', tokenResponse.status)
        setIsLoadingChapters(false)
        return
      }

      const { token } = await tokenResponse.json()
      console.log('✅ TIMELINE VIEW: Got auth token')

      console.log('📡 TIMELINE VIEW: Calling /api/timezones')
      const response = await fetch('/api/timezones', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('📡 TIMELINE VIEW: Response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ TIMELINE VIEW: Chapters fetched:', data.timeZones?.length || 0)
        setChapters(data.timeZones || [])
      } else {
        console.error('❌ TIMELINE VIEW: Failed to fetch chapters:', response.status)
      }
    } catch (error) {
      console.error('❌ TIMELINE VIEW: Error fetching chapters:', error)
    } finally {
      setIsLoadingChapters(false)
    }
  }

  // Group memories by their actual date for social media feed style
  const timelineGroups: TimelineGroup[] = memories
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) // Most recent first
    .reduce((groups: TimelineGroup[], memory) => {
      const memoryDate = new Date(memory.createdAt)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      let groupKey: string
      let label: string
      
      if (memoryDate.toDateString() === today.toDateString()) {
        groupKey = 'today'
        label = 'Today'
      } else if (memoryDate.toDateString() === yesterday.toDateString()) {
        groupKey = 'yesterday'
        label = 'Yesterday'
      } else if (memoryDate >= new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)) {
        groupKey = `week-${memoryDate.toDateString()}`
        label = memoryDate.toLocaleDateString('en-GB', { weekday: 'long', month: 'short', day: 'numeric' })
      } else if (memoryDate >= new Date(today.getFullYear(), today.getMonth(), 1)) {
        groupKey = `month-${memoryDate.getMonth()}-${memoryDate.getFullYear()}`
        label = memoryDate.toLocaleDateString('en-GB', { month: 'long', day: 'numeric' })
      } else {
        groupKey = `${memoryDate.getFullYear()}-${memoryDate.getMonth()}-${memoryDate.getDate()}`
        label = memoryDate.toLocaleDateString('en-GB', { 
          weekday: 'long',
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      }

      const existingGroup = groups.find(g => g.date === groupKey)
      if (existingGroup) {
        existingGroup.memories.push(memory)
      } else {
        groups.push({
          date: groupKey,
          label,
          memories: [memory]
        })
      }
      
      return groups
    }, [])

  const handleMemoryClick = (memoryId: string) => {
    setExpandedMemory(expandedMemory === memoryId ? null : memoryId)
  }

  const getChapterMemories = (chapterId: string) => {
    return memories.filter(memory => memory.timeZoneId === chapterId)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Chapters */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 sticky top-32">
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">Life Chapters</h2>
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  {chapters.length} chapters created
                </p>
              </div>

              <div className="p-4 max-h-96 overflow-y-auto">
                {isLoadingChapters ? (
                  <div className="text-center py-8 text-slate-500">
                    Loading chapters...
                  </div>
                ) : chapters.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-slate-500 mb-4">No chapters yet</div>
                    <p className="text-sm text-slate-400 mb-4">
                      Create your first life chapter to organise your memories by time periods
                    </p>
                    <p className="text-xs text-slate-500">
                      Use the "Add Chapter" button in the top navigation to create your first chapter.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {chapters
                      .sort((a, b) => {
                        if (!a.startDate || !b.startDate) return 0
                        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
                      })
                      .map((chapter) => {
                        const chapterMemories = getChapterMemories(chapter.id)
                        const startYear = chapter.startDate ? new Date(chapter.startDate).getFullYear() : null
                        const endYear = chapter.endDate ? new Date(chapter.endDate).getFullYear() : null
                        
                        return (
                          <div
                            key={chapter.id}
                            className="bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 rounded-xl border border-slate-200/50 cursor-pointer transition-all duration-200 overflow-hidden"
                            onClick={() => onStartCreating?.(chapter.id, chapter.title)}
                          >
                            {/* Chapter Header Image */}
                            {chapter.headerImageUrl && (
                              <div className="relative h-20 bg-slate-100">
                                <img 
                                  src={chapter.headerImageUrl} 
                                  alt={chapter.title}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/20"></div>
                              </div>
                            )}
                            
                            <div className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-slate-900 mb-1">{chapter.title}</h4>
                                  {chapter.description && (
                                    <p className="text-xs text-slate-600 mb-2 line-clamp-2">{chapter.description}</p>
                                  )}
                                  <div className="text-xs text-slate-500 space-y-1">
                                    {(startYear || endYear) && (
                                      <div className="flex items-center space-x-1">
                                        <Calendar size={12} />
                                        <span>
                                          {startYear && endYear ? `${startYear} - ${endYear}` : 
                                           startYear ? `From ${startYear}` : 
                                           endYear ? `Until ${endYear}` : ''}
                                        </span>
                                      </div>
                                    )}
                                    {chapter.location && (
                                      <div className="flex items-center space-x-1">
                                        <MapPin size={12} />
                                        <span>{chapter.location}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center space-x-1">
                                      <Camera size={12} />
                                      <span>{chapterMemories.length} memories</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center ml-3">
                                  <span className="text-white text-xs font-bold">
                                    {startYear ? startYear.toString().slice(-2) : '?'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content - Timeline Feed */}
          <div className="lg:col-span-2">
            {memories.length === 0 ? (
              // Empty state but within the timeline structure
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-8 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <span className="text-white text-2xl font-bold">📖</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Ready to Fill Your Timeline</h3>
                <p className="text-slate-600 leading-relaxed mb-6">
                  Your chapters are ready for memories! Start adding photos, videos, and stories to bring your timeline to life.
                </p>
                <div className="bg-slate-50 rounded-xl p-6 mb-6">
                  <h4 className="font-semibold text-slate-900 mb-3">✨ Next Steps:</h4>
                  <div className="text-sm text-slate-600 space-y-2 text-left">
                    <p>• 📖 Create life chapters for different time periods</p>
                    <p>• 📸 Add photos and videos to your chapters</p>
                    <p>• 📝 Write stories and descriptions for your memories</p>
                    <p>• 🎵 Upload audio recordings and voice notes</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button 
                    onClick={() => onStartCreating?.()}
                    className="bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-700 hover:to-slate-600 text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    📸 Add First Memory
                  </button>
                </div>
                <p className="text-sm text-slate-500 text-center mt-4">
                  💡 Use the "Add Chapter" button in the top navigation to create your first chapter.
                </p>
              </div>
            ) : (
              // Memory feed when memories exist
              <div className="space-y-8" ref={timelineRef}>
                {timelineGroups.map((group, groupIndex) => (
                  <div key={group.date}>
                    {/* Date Header */}
                    <div className="flex items-center mb-6">
                      <div className="flex-1 h-px bg-slate-200"></div>
                      <div className="px-4 py-2 bg-slate-100 rounded-full">
                        <span className="text-sm font-medium text-slate-700">{group.label}</span>
                      </div>
                      <div className="flex-1 h-px bg-slate-200"></div>
                    </div>

                    {/* Memories */}
                    <div className="space-y-6">
                      {group.memories.map((memory) => (
                        <article key={memory.id} className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden hover:shadow-xl transition-all duration-300">
                          {/* Memory Header */}
                          <div className="p-4 border-b border-slate-100">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-sm font-bold">
                                    {memory.title ? memory.title.charAt(0).toUpperCase() : 'M'}
                                  </span>
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <h3 className="font-semibold text-slate-900">
                                      {memory.title || 'Memory'}
                                    </h3>
                                    {memory.timeZone && (
                                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full flex items-center space-x-1">
                                        {memory.timeZone.type === 'PRIVATE' ? (
                                          <Lock size={10} />
                                        ) : (
                                          <Users size={10} />
                                        )}
                                        <span>{memory.timeZone.title}</span>
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500">
                                    {formatRelativeTime(memory.createdAt)} • {formatDate(memory.createdAt)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1 text-slate-400">
                                <Clock size={14} />
                              </div>
                            </div>
                          </div>

                          {/* Memory Content */}
                          <div className="p-4">
                            {/* Text Content */}
                            {memory.textContent && (
                              <p className="text-slate-700 leading-relaxed mb-4 whitespace-pre-wrap">
                                {memory.textContent}
                              </p>
                            )}

                            {/* Media Content */}
                            {memory.media && memory.media.length > 0 && (
                              <div className="space-y-4">
                                {memory.media.map((media) => (
                                  <div key={media.id} className="rounded-xl overflow-hidden">
                                    {media.type === 'IMAGE' && (
                                      <img 
                                        src={media.storage_url} 
                                        alt={memory.title || ''} 
                                        className="w-full max-h-96 object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                                        onClick={() => handleMemoryClick(memory.id)}
                                      />
                                    )}
                                    {media.type === 'VIDEO' && (
                                      <video 
                                        src={media.storage_url} 
                                        controls 
                                        className="w-full max-h-96 rounded-xl"
                                        poster={media.thumbnail_url || undefined}
                                      />
                                    )}
                                    {media.type === 'AUDIO' && (
                                      <div className="bg-slate-50 p-4 rounded-xl">
                                        <div className="flex items-center space-x-3 mb-3">
                                          <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
                                            <span className="text-white text-lg">🎵</span>
                                          </div>
                                          <div>
                                            <p className="font-medium text-slate-900">
                                              {media.file_name || 'Audio Recording'}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                              {(media.file_size / 1024 / 1024).toFixed(1)} MB
                                            </p>
                                          </div>
                                        </div>
                                        <audio 
                                          src={media.storage_url} 
                                          controls 
                                          className="w-full"
                                        />
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {memory.media.length > 1 && (
                                  <p className="text-xs text-slate-500 text-center">
                                    {memory.media.length} files attached
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Memory Actions */}
                          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <button className="flex items-center space-x-1 text-slate-500 hover:text-slate-700 transition-colors">
                                  <Heart size={16} />
                                  <span className="text-sm">Like</span>
                                </button>
                                <button className="flex items-center space-x-1 text-slate-500 hover:text-slate-700 transition-colors">
                                  <MessageCircle size={16} />
                                  <span className="text-sm">Comment</span>
                                </button>
                                <button className="flex items-center space-x-1 text-slate-500 hover:text-slate-700 transition-colors">
                                  <Share size={16} />
                                  <span className="text-sm">Share</span>
                                </button>
                              </div>
                              <div className="flex items-center space-x-2">
                                {onEdit && (
                                  <button 
                                    onClick={() => onEdit(memory)}
                                    className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
                                  >
                                    Edit
                                  </button>
                                )}
                                {onDelete && (
                                  <button 
                                    onClick={() => onDelete(memory)}
                                    className="text-xs text-red-500 hover:text-red-700 transition-colors"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Load More / End of Timeline */}
                <div className="text-center py-8">
                  <div className="inline-flex items-center space-x-2 text-slate-500">
                    <div className="w-4 h-4 bg-slate-300 rounded-full"></div>
                    <span className="text-sm">You've reached the beginning of your story</span>
                    <div className="w-4 h-4 bg-slate-300 rounded-full"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


    </div>
  )
} 