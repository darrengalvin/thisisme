'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Settings, Calendar, MapPin, Edit, Camera, Trash2, Users, Upload, X, Save, Info, Move, Mic, Crown, Sparkles } from 'lucide-react'
import { TimeZoneWithRelations, MemoryWithRelations } from '@/lib/types'
import { useAuth } from './AuthProvider'
import DeleteConfirmationModal from './DeleteConfirmationModal'
import ImageCropper from './ImageCropper'
import VoiceRecorder from './VoiceRecorder'
import UpgradeModal from './UpgradeModal'
import toast from 'react-hot-toast'

interface GroupManagerProps {
  user?: { id: string; email: string; birthYear?: number } | null
  onCreateGroup?: () => void
  onStartCreating?: (chapterId?: string, chapterTitle?: string) => void
}

interface EditChapterData {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  location: string
  headerImageUrl: string | null
}

const formatDateRange = (startDate?: string | null, endDate?: string | null) => {
  if (!startDate && !endDate) return 'No dates set'
  
  const start = startDate ? new Date(startDate) : null
  const end = endDate ? new Date(endDate) : null
  
  if (start && end) {
    const startYear = start.getFullYear()
    const endYear = end.getFullYear()
    
    if (startYear === endYear) {
      return `${startYear}`
    } else {
      return `${startYear} - ${endYear}`
    }
  } else if (start) {
    return `From ${start.getFullYear()}`
  } else if (end) {
    return `Until ${end.getFullYear()}`
  }
  
  return 'No dates set'
}

export default function GroupManager({ user: propUser, onCreateGroup, onStartCreating }: GroupManagerProps) {
  const { user: authUser } = useAuth()
  const user = propUser || authUser
  const [chapters, setChapters] = useState<TimeZoneWithRelations[]>([])
  const [memories, setMemories] = useState<MemoryWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingChapter, setEditingChapter] = useState<EditChapterData | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedHeaderImage, setSelectedHeaderImage] = useState<File | null>(null)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [chapterToDelete, setChapterToDelete] = useState<{ id: string; title: string } | null>(null)
  const [isDeletingChapter, setIsDeletingChapter] = useState(false)
  
  // Image cropping state
  const [showImageCropper, setShowImageCropper] = useState(false)
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPremiumUser, setIsPremiumUser] = useState(false)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [premiumLoading, setPremiumLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  useEffect(() => {
    if (user) {
      fetchChaptersAndMemories()
      checkPremiumStatus()
    }
  }, [user])

  const checkPremiumStatus = async () => {
    if (!user) {
      setPremiumLoading(false)
      return
    }
    
    // Temporary override for specific user
    console.log('Checking premium for user:', user.email)
    if (user.email === 'dgalvin@yourcaio.co.uk') {
      console.log('✅ Premium enabled for dgalvin@yourcaio.co.uk')
      setIsPremiumUser(true)
      setPremiumLoading(false)
      return
    }
    
    try {
      console.log('📡 GROUP MANAGER: Getting auth token for premium status check...')
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      if (!tokenResponse.ok) {
        console.error('❌ GROUP MANAGER: Failed to get auth token for premium check')
        throw new Error('Failed to get auth token')
      }

      const { token } = await tokenResponse.json()
      console.log('✅ GROUP MANAGER: Got auth token for premium check')

      console.log('📡 GROUP MANAGER: Calling /api/user/premium-status with JWT token...')
      const response = await fetch('/api/user/premium-status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      })

      console.log('📊 GROUP MANAGER: Premium status response:', response.status, response.ok)

      if (response.ok) {
        const data = await response.json()
        console.log('📊 GROUP MANAGER: Premium status data:', data)
        setIsPremiumUser(data.isPremium)
        console.log('🔄 GROUP MANAGER: Premium status updated:', data.isPremium)
      } else {
        console.error('❌ GROUP MANAGER: Premium status check failed:', response.status)
      }
    } catch (error) {
      console.error('❌ GROUP MANAGER: Error checking premium status:', error)
    } finally {
      setPremiumLoading(false)
      console.log('✅ GROUP MANAGER: Premium status check completed')
    }
  }

  useEffect(() => {
    // Clean up preview URL when modal closes
    return () => {
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl)
      }
    }
  }, [previewImageUrl])

  const fetchChaptersAndMemories = async () => {
    try {
      if (!user) {
        console.log('❌ GROUP MANAGER: No user, skipping data fetch')
        setIsLoading(false)
        return
      }

      console.log('🔑 GROUP MANAGER: Getting auth token for user:', user.id)

      // Get custom JWT token for API
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      if (!tokenResponse.ok) {
        console.error('❌ GROUP MANAGER: Failed to get auth token:', tokenResponse.status)
        setIsLoading(false)
        return
      }

      const { token } = await tokenResponse.json()
      console.log('✅ GROUP MANAGER: Got auth token')
      
      // Fetch chapters and memories in parallel
      const [chaptersResponse, memoriesResponse] = await Promise.all([
        fetch('/api/timezones', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/memories', {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ])

      if (chaptersResponse.ok) {
        const chaptersData = await chaptersResponse.json()
        console.log('📚 GROUP MANAGER: Loaded chapters:', chaptersData.timeZones?.length || 0)
        setChapters(chaptersData.timeZones || [])
      } else {
        console.error('❌ GROUP MANAGER: Failed to fetch chapters:', chaptersResponse.status)
      }

      if (memoriesResponse.ok) {
        const memoriesData = await memoriesResponse.json()
        console.log('💭 GROUP MANAGER: Loaded memories:', memoriesData.data?.length || 0)
        setMemories(memoriesData.data || [])
      } else {
        console.error('❌ GROUP MANAGER: Failed to fetch memories:', memoriesResponse.status)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load chapters and memories')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchChapters = async () => {
    try {
      const token = await getAuthToken()
      if (!token) return
      
      const response = await fetch('/api/timezones', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setChapters(data.timeZones || [])
      }
    } catch (error) {
      console.error('Failed to fetch chapters:', error)
      toast.error('Failed to load chapters')
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to get memory count for a chapter
  const getMemoryCount = (chapterId: string) => {
    return memories.filter(memory => memory.timeZoneId === chapterId).length
  }

  const getAuthToken = async () => {
    if (!user) return null
    
    const tokenResponse = await fetch('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, email: user.email }),
    })
    
    if (!tokenResponse.ok) return null
    
    const { token } = await tokenResponse.json()
    return token
  }

  const formatDateForInput = (dateString: string | null | undefined) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      return date.toISOString().split('T')[0] // Convert to yyyy-MM-dd format
    } catch {
      return ''
    }
  }

  const handleVoiceRecord = () => {
    if (!isPremiumUser) {
      setShowUpgradeModal(true)
      return
    }
    
    setShowVoiceRecorder(true)
  }

  const handleVoiceTranscription = (transcribedText: string) => {
    if (editingChapter) {
      setEditingChapter({
        ...editingChapter,
        description: editingChapter.description ? `${editingChapter.description}\n\n${transcribedText}` : transcribedText
      })
    }
    setShowVoiceRecorder(false)
  }

  const handleEditChapter = (chapter: TimeZoneWithRelations) => {
    setEditingChapter({
      id: chapter.id,
      title: chapter.title,
      description: chapter.description || '',
      startDate: formatDateForInput(chapter.startDate),
      endDate: formatDateForInput(chapter.endDate),
      location: chapter.location || '',
      headerImageUrl: chapter.headerImageUrl || null
    })
    setSelectedHeaderImage(null)
    setPreviewImageUrl(null)
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('Image must be smaller than 10MB')
        return
      }
      
      // Show cropper immediately
      const reader = new FileReader()
      reader.onload = (e) => {
        setTempImageUrl(e.target?.result as string)
        setShowImageCropper(true)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle crop complete
  const handleCropComplete = (croppedFile: File | null) => {
    if (croppedFile) {
      console.log('🎨 CROP: Setting new cropped image', { 
        fileSize: croppedFile.size,
        fileName: croppedFile.name 
      })
      
      setSelectedHeaderImage(croppedFile)
      
      // Clean up old preview URL
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl)
      }
      
      // Create new preview URL from cropped image
      const newPreviewUrl = URL.createObjectURL(croppedFile)
      console.log('🎨 CROP: Created new preview URL', newPreviewUrl)
      setPreviewImageUrl(newPreviewUrl)
    }
    setShowImageCropper(false)
    setTempImageUrl(null)
  }

  const removeHeaderImage = () => {
    setSelectedHeaderImage(null)
    if (previewImageUrl) {
      URL.revokeObjectURL(previewImageUrl)
      setPreviewImageUrl(null)
    }
    if (editingChapter) {
      setEditingChapter({
        ...editingChapter,
        headerImageUrl: null
      })
    }
  }

  const handleUpdateChapter = async () => {
    if (!editingChapter) return

    setIsUpdating(true)
    try {
      const formData = new FormData()
      formData.append('title', editingChapter.title)
      formData.append('description', editingChapter.description)
      formData.append('startDate', editingChapter.startDate)
      formData.append('endDate', editingChapter.endDate)
      formData.append('location', editingChapter.location)
      
      if (selectedHeaderImage) {
        formData.append('headerImage', selectedHeaderImage)
      } else if (editingChapter.headerImageUrl === null) {
        formData.append('removeHeaderImage', 'true')
      }

      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(`/api/timezones/${editingChapter.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        toast.success('Chapter updated successfully!')
        setEditingChapter(null)
        fetchChaptersAndMemories() // Refresh the list
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to update chapter')
      }
    } catch (error) {
      console.error('Update error:', error)
      toast.error('Failed to update chapter')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDeleteChapter = (chapterId: string, chapterTitle: string) => {
    setChapterToDelete({ id: chapterId, title: chapterTitle })
    setShowDeleteModal(true)
  }

  const confirmDeleteChapter = async () => {
    if (!chapterToDelete) return
    
    setIsDeletingChapter(true)
    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(`/api/timezones/${chapterToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        toast.success('Chapter deleted successfully!')
        fetchChaptersAndMemories() // Refresh the list
        setShowDeleteModal(false)
        setChapterToDelete(null)
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to delete chapter')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete chapter')
    } finally {
      setIsDeletingChapter(false)
    }
  }

  const cancelDeleteChapter = () => {
    setShowDeleteModal(false)
    setChapterToDelete(null)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading your life chapters...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {/* Page Title and New Chapter Button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Life Chapters</h1>
            <p className="text-slate-600">
              {chapters.length} {chapters.length === 1 ? 'chapter' : 'chapters'} • Organise and edit your life story
            </p>
          </div>
          <button
            onClick={onCreateGroup}
            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
          >
            <Plus size={20} />
            <span>New Chapter</span>
          </button>
        </div>
        {chapters.length === 0 ? (
          <div className="text-center max-w-md mx-auto py-16">
            <div className="w-24 h-24 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Camera size={40} className="text-slate-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">No chapters yet</h3>
            <p className="text-slate-600 mb-8 leading-relaxed">
              Create your first life chapter to organise your memories around important periods, places, or themes in your life.
            </p>
            <button 
              onClick={onCreateGroup} 
              className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Create Your First Chapter
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {chapters
              .sort((a, b) => {
                // Robust chronological sorting - same logic as TimelineView and ChronologicalTimelineView
                const aDate = a.startDate ? new Date(a.startDate) : (a.createdAt ? new Date(a.createdAt) : new Date('1900-01-01'))
                const bDate = b.startDate ? new Date(b.startDate) : (b.createdAt ? new Date(b.createdAt) : new Date('1900-01-01'))
                
                const aTime = isNaN(aDate.getTime()) ? new Date('1900-01-01').getTime() : aDate.getTime()
                const bTime = isNaN(bDate.getTime()) ? new Date('1900-01-01').getTime() : bDate.getTime()
                
                return aTime - bTime
              })
              .map((chapter, index) => (
              <div 
                key={chapter.id} 
                className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-visible border border-slate-200/50 group"
              >
                {/* Chapter Image/Header */}
                <div className="relative h-64 bg-gradient-to-br from-slate-100 to-slate-200">
                  {chapter.headerImageUrl ? (
                    <img
                      src={chapter.headerImageUrl}
                      alt={chapter.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <Camera size={40} className="text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm font-medium">No header image</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Overlay with action buttons */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center space-x-3">
                    {/* Info Icon with Hover Details */}
                    <div className="relative group/info">
                      <button
                        className="bg-white/90 hover:bg-white text-slate-700 p-2 rounded-lg shadow-lg transition-all duration-200"
                        title="Chapter Details"
                      >
                        <Info size={16} />
                      </button>
                      
                      {/* Hover Tooltip */}
                      <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 w-80 bg-white rounded-lg shadow-2xl border border-slate-200 p-4 opacity-0 group-hover/info:opacity-100 transition-all duration-200 pointer-events-none z-[99999]" style={{ zIndex: 99999 }}>
                        <div className="space-y-3">
                          <div className="border-b border-slate-100 pb-2">
                            <h4 className="font-semibold text-slate-900 text-sm">{chapter.title}</h4>
                            <p className="text-xs text-slate-500">
                              {chapter.startDate && chapter.endDate && 
                                `${new Date(chapter.startDate).getFullYear()} - ${new Date(chapter.endDate).getFullYear()}`
                              }
                            </p>
                          </div>
                          
                          {chapter.description && (
                            <div>
                              <p className="text-xs font-medium text-slate-700 mb-1">Description:</p>
                              <p className="text-xs text-slate-600 leading-relaxed">{chapter.description}</p>
                            </div>
                          )}
                          
                          {chapter.location && (
                            <div>
                              <p className="text-xs font-medium text-slate-700 mb-1">Location:</p>
                              <p className="text-xs text-slate-600">{chapter.location}</p>
                            </div>
                          )}
                          
                          <div className="pt-2 border-t border-slate-100">
                            <p className="text-xs text-slate-500">
                              {getMemoryCount(chapter.id)} {getMemoryCount(chapter.id) === 1 ? 'memory' : 'memories'} in this chapter
                            </p>
                          </div>
                        </div>
                        
                        {/* Arrow pointing up to button */}
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-l border-b border-slate-200 rotate-45"></div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleEditChapter(chapter)}
                      className="bg-white/90 hover:bg-white text-slate-700 p-2 rounded-lg shadow-lg transition-all duration-200"
                      title="Edit Chapter"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteChapter(chapter.id, chapter.title)}
                      className="bg-red-500/90 hover:bg-red-500 text-white p-2 rounded-lg shadow-lg transition-all duration-200"
                      title="Delete Chapter"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Chapter Content */}
                <div className="p-5">
                  <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-slate-700 transition-colors line-clamp-2">
                    {chapter.title}
                  </h3>
                  
                  {chapter.description && (
                    <p className="text-slate-600 text-sm mb-4 line-clamp-3 leading-relaxed">
                      {chapter.description}
                    </p>
                  )}

                  {/* Chapter Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center space-x-2">
                      <Calendar size={14} className="text-blue-500" />
                      <span className="text-sm text-slate-600 font-medium">
                        {formatDateRange(chapter.startDate, chapter.endDate)}
                      </span>
                    </div>

                    {chapter.location && (
                      <div className="flex items-center space-x-2">
                        <MapPin size={14} className="text-green-500" />
                        <span className="text-sm text-slate-600 font-medium line-clamp-1">
                          {chapter.location}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Users size={14} className="text-purple-500" />
                      <span className="text-sm text-slate-600 font-medium">
                        {getMemoryCount(chapter.id)} {getMemoryCount(chapter.id) === 1 ? 'memory' : 'memories'}
                      </span>
                    </div>
                  </div>

                  {/* Add Memory Button - Prominent placement */}
                  {onStartCreating && (
                    <div className="mb-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onStartCreating(chapter.id, chapter.title)
                        }}
                        className="w-full bg-sky-600 hover:bg-sky-700 text-white py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                        title={`Add new memory to ${chapter.title}`}
                      >
                        <Plus size={16} />
                        <span>Add Memory</span>
                      </button>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex items-center space-x-2">
                    
                    {/* Info Icon with Details */}
                    <div className="relative group/quickinfo">
                      <button
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-lg transition-all duration-200"
                        title="Chapter Details"
                      >
                        <Info size={14} />
                      </button>
                      
                      {/* Hover Tooltip */}
                      <div className="absolute right-0 bottom-full mb-2 w-80 bg-white rounded-lg shadow-2xl border border-slate-200 p-4 opacity-0 group-hover/quickinfo:opacity-100 transition-all duration-200 pointer-events-none z-[99999]" style={{ zIndex: 99999 }}>
                        <div className="space-y-3">
                          <div className="border-b border-slate-100 pb-2">
                            <h4 className="font-semibold text-slate-900 text-sm">{chapter.title}</h4>
                            <p className="text-xs text-slate-500">
                              {chapter.startDate && chapter.endDate && 
                                `${new Date(chapter.startDate).getFullYear()} - ${new Date(chapter.endDate).getFullYear()}`
                              }
                            </p>
                          </div>
                          
                          {chapter.description && (
                            <div>
                              <p className="text-xs font-medium text-slate-700 mb-1">Description:</p>
                              <p className="text-xs text-slate-600 leading-relaxed">{chapter.description}</p>
                            </div>
                          )}
                          
                          {chapter.location && (
                            <div>
                              <p className="text-xs font-medium text-slate-700 mb-1">Location:</p>
                              <p className="text-xs text-slate-600">{chapter.location}</p>
                            </div>
                          )}
                          
                          <div className="pt-2 border-t border-slate-100">
                            <p className="text-xs text-slate-500">
                              {getMemoryCount(chapter.id)} {getMemoryCount(chapter.id) === 1 ? 'memory' : 'memories'} in this chapter
                            </p>
                          </div>
                        </div>
                        
                        {/* Arrow pointing up to button */}
                        <div className="absolute -bottom-1 right-6 w-2 h-2 bg-white border-l border-b border-slate-200 rotate-45"></div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleEditChapter(chapter)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-1"
                    >
                      <Edit size={14} />
                      <span>Edit</span>
                    </button>
                    <button
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-lg transition-all duration-200"
                      title="More options"
                    >
                      <Settings size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add New Chapter Card */}
            <div 
              onClick={onCreateGroup}
              className="bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-2xl transition-all duration-300 cursor-pointer group"
            >
              <div className="h-48 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-200 group-hover:bg-slate-300 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-colors">
                    <Plus size={24} className="text-slate-500" />
                  </div>
                  <p className="text-slate-600 font-medium">Add New Chapter</p>
                </div>
              </div>
              <div className="p-5">
                <p className="text-slate-500 text-sm text-center">
                  Create a new life chapter to organise your memories
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Chapter Modal */}
      {editingChapter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Edit Chapter </h2>
              <button
                onClick={() => setEditingChapter(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Header Image Section */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-3">Header Image</label>
                <div className="space-y-4">
                  {/* Current/Preview Image */}
                  {(previewImageUrl || editingChapter.headerImageUrl) && (
                    <div className="space-y-4">
                      <div className="relative max-w-md mx-auto">
                        <img
                          key={previewImageUrl || editingChapter.headerImageUrl || 'no-image'}
                          src={previewImageUrl || editingChapter.headerImageUrl || ''}
                          alt="Header preview"
                          className="w-full h-48 object-cover rounded-xl"
                        />
                        <button
                          onClick={removeHeaderImage}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-lg shadow-lg"
                          title="Remove image"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      
                      {/* Crop & Position Button */}
                      <div className="flex items-center justify-center">
                        <button
                          onClick={async () => {
                            const imageUrl = previewImageUrl || editingChapter.headerImageUrl
                            if (imageUrl) {
                              if (imageUrl.startsWith('blob:')) {
                                // Already a blob URL, use directly
                                setTempImageUrl(imageUrl)
                                setShowImageCropper(true)
                              } else {
                                // External URL - need to fetch and convert to blob for cropping
                                try {
                                  const response = await fetch(imageUrl)
                                  const blob = await response.blob()
                                  const blobUrl = URL.createObjectURL(blob)
                                  setTempImageUrl(blobUrl)
                                  setShowImageCropper(true)
                                } catch (error) {
                                  console.error('Error loading image for cropping:', error)
                                  toast.error('Failed to load image for cropping')
                                }
                              }
                            }
                          }}
                          className="inline-flex items-center space-x-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          <Move size={16} />
                          <span>Crop & Position</span>
                        </button>
                      </div>
                      
                      <p className="text-xs text-slate-500 text-center">
                        {selectedHeaderImage ? 'Image has been cropped and positioned' : 'Current chapter image'}
                      </p>
                    </div>
                  )}
                  
                  {/* Upload Button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-6 text-center transition-colors"
                  >
                    <Upload size={32} className="text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-600 font-medium">
                      {editingChapter.headerImageUrl || previewImageUrl ? 'Change header image' : 'Upload header image'}
                    </p>
                    <p className="text-slate-500 text-sm mt-1">PNG, JPG or GIF up to 10MB</p>
                  </button>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Title</label>
                <input
                  type="text"
                  value={editingChapter.title}
                  onChange={(e) => setEditingChapter({ ...editingChapter, title: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  placeholder="Chapter title"
                />
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-slate-900">
                    Description
                  </label>
                  {isPremiumUser && (
                    <div className="flex items-center space-x-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                      <Crown size={12} />
                      <span className="font-medium">PRO</span>
                    </div>
                  )}
                </div>
                
                <div className="relative">
                  <textarea
                    value={editingChapter.description}
                    onChange={(e) => setEditingChapter({ ...editingChapter, description: e.target.value })}
                    rows={3}
                    className={`w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent resize-none ${isPremiumUser ? 'pr-16' : ''}`}
                    placeholder="Describe this chapter of your life..."
                  />
                  
                  {/* Premium Voice Button - Positioned on textarea */}
                  {isPremiumUser && (
                    <div className="absolute bottom-3 right-3">
                      <button
                        type="button"
                        onClick={handleVoiceRecord}
                        className="p-2.5 rounded-full transition-all duration-200 shadow-lg bg-slate-700 hover:bg-slate-800 text-white hover:shadow-xl border-2 border-slate-600 hover:border-slate-500"
                        title="Voice-to-Text Transcription (Premium Feature)"
                      >
                        <Mic size={18} />
                      </button>
                    </div>
                  )}

                  {/* Premium Feature Hint for Non-Premium Users */}
                  {!isPremiumUser && (
                    <div className="absolute bottom-3 right-3">
                      <div className="group relative">
                        <button
                          type="button"
                          onClick={handleVoiceRecord}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-colors opacity-60 border border-slate-200"
                          title="Voice transcription available with Pro upgrade"
                        >
                          <Mic size={16} />
                        </button>
                        <div className="absolute -top-12 right-0 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          <div className="flex items-center space-x-1">
                            <Sparkles size={10} />
                            <span>Upgrade to Pro</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {isPremiumUser && (
                  <div className="mt-2 text-xs text-slate-500 flex items-center space-x-1">
                    <Sparkles size={12} className="text-slate-600" />
                    <span>Click the microphone in the text box to use AI voice transcription</span>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={editingChapter.startDate}
                    onChange={(e) => setEditingChapter({ ...editingChapter, startDate: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">End Date</label>
                  <input
                    type="date"
                    value={editingChapter.endDate}
                    onChange={(e) => setEditingChapter({ ...editingChapter, endDate: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Location</label>
                <input
                  type="text"
                  value={editingChapter.location}
                  onChange={(e) => setEditingChapter({ ...editingChapter, location: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  placeholder="Where did this chapter take place?"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-4 p-6 border-t border-slate-200">
              <button
                onClick={() => setEditingChapter(null)}
                className="px-6 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateChapter}
                disabled={isUpdating || !editingChapter.title.trim()}
                className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white px-6 py-2 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2"
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Update Chapter</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        title="Delete Chapter"
        message="Are you sure you want to delete"
        itemName={chapterToDelete?.title || ''}
        itemType="chapter"
        onConfirm={confirmDeleteChapter}
        onCancel={cancelDeleteChapter}
        isLoading={isDeletingChapter}
      />

      {/* Image Cropper Modal */}
      {showImageCropper && tempImageUrl && (
        <ImageCropper
          imageUrl={tempImageUrl}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowImageCropper(false)
            setTempImageUrl(null)
          }}
          title="Position your chapter image"
          aspectRatio={16 / 9}
          outputWidth={480}
          outputHeight={270}
        />
      )}
      
      {/* Voice Recorder Modal */}
      {showVoiceRecorder && (
        <VoiceRecorder
          onTranscription={handleVoiceTranscription}
          onClose={() => setShowVoiceRecorder(false)}
          isPremium={isPremiumUser}
        />
      )}
      
      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  )
} 