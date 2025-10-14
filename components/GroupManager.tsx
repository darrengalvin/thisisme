'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Settings, Calendar, MapPin, Edit, Camera, Trash2, Users, Upload, X, Save, Info, Move, Mic, Crown, Sparkles, CheckCircle, AlertCircle, List, BookOpen, BarChart3 } from 'lucide-react'
import { TimeZoneWithRelations, MemoryWithRelations } from '@/lib/types'
import { useAuth } from './AuthProvider'
import DeleteConfirmationModal from './DeleteConfirmationModal'
import ImageCropper from './ImageCropper'
import VoiceRecorder from './VoiceRecorder'
import UpgradeModal from './UpgradeModal'
import InviteCollaborators from './InviteCollaborators'
import MemoryContributions from './MemoryContributions'
import PhotoTagDisplay from './PhotoTagDisplay'
import ChronologicalTimelineView from './ChronologicalTimelineView'
import toast from 'react-hot-toast'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import '@/styles/datepicker.css'

interface GroupManagerProps {
  user?: { id: string; email: string; birthYear?: number } | null
  onCreateGroup?: () => void
  onStartCreating?: (chapterId?: string, chapterTitle?: string) => void
  onNavigateToMyPeople?: () => void
  onEdit?: (memory: MemoryWithRelations) => void
  onDelete?: (memory: MemoryWithRelations) => void
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

export default function GroupManager({ user: propUser, onCreateGroup, onStartCreating, onNavigateToMyPeople, onEdit, onDelete }: GroupManagerProps) {
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
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [showCollaboratorsModal, setShowCollaboratorsModal] = useState(false)
  const [collaboratorsChapter, setCollaboratorsChapter] = useState<TimeZoneWithRelations | null>(null)
  const [networkCollaborators, setNetworkCollaborators] = useState<any[]>([])
  
  // View mode toggle
  const [viewMode, setViewMode] = useState<'chapters' | 'feed' | 'timeline'>('chapters')
  
  // FAB state
  const [isFabOpen, setIsFabOpen] = useState(false)
  
  // Image cropping state
  const [showImageCropper, setShowImageCropper] = useState(false)
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPremiumUser, setIsPremiumUser] = useState(false)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [premiumLoading, setPremiumLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  
  // Auto-save functionality
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isInitialLoad = useRef(true)
  const [originalChapter, setOriginalChapter] = useState<EditChapterData | null>(null)
  
  // Portal mounting state for SSR compatibility
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (user) {
      fetchChaptersAndMemories()
      checkPremiumStatus()
    }
  }, [user])

  // Fetch network collaborators when chapter is selected
  useEffect(() => {
    if (selectedChapterId) {
      fetchNetworkCollaborators(selectedChapterId)
    }
  }, [selectedChapterId])

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

  // Fetch network people who have access to a specific chapter
  const fetchNetworkCollaborators = async (chapterId: string) => {
    try {
      if (!user?.id || !user?.email) {
        console.log('❌ No user data for fetching network collaborators')
        return
      }

      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      if (!tokenResponse.ok) {
        console.error('❌ Failed to get auth token for network collaborators')
        return
      }

      const { token } = await tokenResponse.json()

      const response = await fetch('/api/network', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Filter to only people who have this chapter in their pending_chapter_invitations
        const peopleWithAccess = (data.people || []).filter((person: any) => 
          person.pending_chapter_invitations?.includes(chapterId)
        )
        console.log('👥 Loaded network collaborators for chapter:', peopleWithAccess.length)
        setNetworkCollaborators(peopleWithAccess)
      } else {
        console.error('❌ Failed to fetch network collaborators')
        setNetworkCollaborators([])
      }
    } catch (error) {
      console.error('Failed to fetch network collaborators:', error)
      setNetworkCollaborators([])
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
    const chapterData = {
      id: chapter.id,
      title: chapter.title,
      description: chapter.description || '',
      startDate: formatDateForInput(chapter.startDate),
      endDate: formatDateForInput(chapter.endDate),
      location: chapter.location || '',
      headerImageUrl: chapter.headerImageUrl || null
    }
    setEditingChapter(chapterData)
    setOriginalChapter({ ...chapterData })
    setSelectedHeaderImage(null)
    setPreviewImageUrl(null)
    setHasUnsavedChanges(false)
    setLastSaved(new Date())
    setAutoSaveError(null)
  }

  // Auto-save function
  const autoSave = useCallback(async () => {
    // Skip if no data, initial load, or currently updating manually
    if (!editingChapter || !user || !originalChapter || isInitialLoad.current || isUpdating) {
      if (isUpdating) {
        console.log('⏸️ AUTO-SAVE: Skipping (manual update in progress)')
      }
      return
    }

    console.log('🔄 AUTO-SAVE: Checking for changes...')

    // Check if there are actual changes
    const hasChanges = 
      editingChapter.title !== originalChapter.title ||
      editingChapter.description !== originalChapter.description ||
      editingChapter.startDate !== originalChapter.startDate ||
      editingChapter.endDate !== originalChapter.endDate ||
      editingChapter.location !== originalChapter.location ||
      editingChapter.headerImageUrl !== originalChapter.headerImageUrl ||
      selectedHeaderImage !== null

    if (!hasChanges) {
      console.log('🔄 AUTO-SAVE: No changes detected, skipping')
      setHasUnsavedChanges(false)
      return
    }

    console.log('💾 AUTO-SAVE: Saving changes...', {
      title: editingChapter.title,
      description: editingChapter.description?.substring(0, 50) + '...',
      descriptionLength: editingChapter.description?.length || 0
    })

    setIsAutoSaving(true)
    setAutoSaveError(null)

    try {
      const token = await getAuthToken()
      if (!token) {
        throw new Error('Authentication failed')
      }

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

      const response = await fetch(`/api/timezones/${editingChapter.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ AUTO-SAVE: Successful! Server returned:', {
          description: result.data?.description?.substring(0, 100) || 'none',
          descriptionLength: result.data?.description?.length || 0,
          fullDescription: result.data?.description || 'none'
        })
        
        // Update state in the correct order to prevent race conditions
        const savedChapter = { ...editingChapter }
        setOriginalChapter(savedChapter)
        setSelectedHeaderImage(null)
        setPreviewImageUrl(null)
        setHasUnsavedChanges(false)
        setLastSaved(new Date())
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Auto-save failed')
      }
    } catch (error) {
      console.error('Auto-save error:', error)
      setAutoSaveError(error instanceof Error ? error.message : 'Auto-save failed')
    } finally {
      setIsAutoSaving(false)
    }
  }, [editingChapter, originalChapter, selectedHeaderImage, user, getAuthToken, isUpdating])

  // Reset initial load flag after modal opens
  useEffect(() => {
    if (editingChapter && originalChapter) {
      console.log('🔓 AUTO-SAVE: Resetting initial load flag in 500ms...')
      isInitialLoad.current = true
      const timer = setTimeout(() => {
        isInitialLoad.current = false
        console.log('✅ AUTO-SAVE: Initial load complete, auto-save now enabled')
      }, 500) // Give 500ms for initial load to complete
      
      return () => clearTimeout(timer)
    }
  }, [editingChapter?.id]) // Only reset when a new chapter is being edited

  // Debounced auto-save effect
  useEffect(() => {
    if (!editingChapter || !originalChapter || isInitialLoad.current) {
      console.log('⏸️ AUTO-SAVE: Skipping (initial load or no data)')
      return
    }

    console.log('⏰ AUTO-SAVE: Change detected, setting 2-second timer...')

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      console.log('⏱️ AUTO-SAVE: Timer expired, triggering auto-save...')
      autoSave()
    }, 2000) // Auto-save after 2 seconds of inactivity

    // Cleanup timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [editingChapter, autoSave])

  // Check for unsaved changes
  useEffect(() => {
    if (!editingChapter || !originalChapter) return

    const hasChanges = 
      editingChapter.title !== originalChapter.title ||
      editingChapter.description !== originalChapter.description ||
      editingChapter.startDate !== originalChapter.startDate ||
      editingChapter.endDate !== originalChapter.endDate ||
      editingChapter.location !== originalChapter.location ||
      editingChapter.headerImageUrl !== originalChapter.headerImageUrl ||
      selectedHeaderImage !== null

    setHasUnsavedChanges(hasChanges)
  }, [editingChapter, originalChapter, selectedHeaderImage])

  // Handle close with auto-save consideration
  const handleCloseEdit = async () => {
    console.log('🚪 CLOSE: Attempting to close, hasUnsavedChanges:', hasUnsavedChanges, 'isAutoSaving:', isAutoSaving)
    
    // If auto-save is in progress, wait for it to complete
    if (isAutoSaving) {
      console.log('⏳ CLOSE: Waiting for auto-save to complete...')
      // Wait up to 5 seconds for auto-save to complete
      const startTime = Date.now()
      while (isAutoSaving && Date.now() - startTime < 5000) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    // If there are still unsaved changes after waiting, trigger a final save
    if (hasUnsavedChanges && !isAutoSaving) {
      console.log('💾 CLOSE: Triggering final save before close...')
      // Clear any pending timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      // Trigger immediate save
      await autoSave()
      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    console.log('✅ CLOSE: All saves complete, closing modal and refreshing data...')
    
    // Close the modal
    setEditingChapter(null)
    setOriginalChapter(null)
    setSelectedHeaderImage(null)
    setPreviewImageUrl(null)
    setHasUnsavedChanges(false)
    setLastSaved(null)
    setAutoSaveError(null)
    
    // Refresh the chapters list to show updated data
    await fetchChaptersAndMemories()
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

    // Clear auto-save timeout to prevent duplicate saves
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
      autoSaveTimeoutRef.current = null
      console.log('🛑 AUTO-SAVE: Cleared timeout (manual save triggered)')
    }

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
        
        // Clear editing state and selected image
        setEditingChapter(null)
        setSelectedHeaderImage(null)
        setPreviewImageUrl(null)
        
        // Refresh the chapters list
        await fetchChaptersAndMemories()
        
        console.log('✅ GROUP MANAGER: Chapter updated and list refreshed')
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

  // Get memories for selected chapter
  const selectedChapterMemories = selectedChapterId 
    ? memories.filter(memory => memory.timeZoneId === selectedChapterId)
    : []

  const selectedChapter = selectedChapterId 
    ? chapters.find(ch => ch.id === selectedChapterId)
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-slate-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        {chapters.length === 0 ? (
          <div className="text-center max-w-2xl mx-auto py-12 pb-40">
            <div className="w-20 h-20 bg-sky-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <span className="text-sky-600 text-3xl">📖</span>
            </div>
            <h3 className="text-3xl font-bold text-slate-900 mb-4">Let's Create Your First Chapter</h3>
            <p className="text-slate-600 mb-8 text-lg leading-relaxed">
              Think of chapters as different periods or phases of your life. They help organize your memories chronologically and make your story easier to explore.
            </p>
            
            <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-2xl p-6 mb-8 border border-sky-100">
              <h4 className="font-semibold text-sky-900 mb-4">💡 Chapter inspiration:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🏫</span>
                  <span className="text-sky-800">School or university years</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🏢</span>
                  <span className="text-sky-800">Your first job or career</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🏠</span>
                  <span className="text-sky-800">Living in a particular city</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">✈️</span>
                  <span className="text-sky-800">Traveling or living abroad</span>
                </div>
              </div>
            </div>

            <div className="mt-6 text-sm text-slate-500">
              <p>💡 <strong>Tip:</strong> You can always add memories to chapters later, but starting with chapters makes your timeline more organized!</p>
            </div>
          </div>
        ) : (
          <div className="lg:flex lg:gap-6 pb-32 min-h-[calc(100vh-300px)]">
            {/* Mobile: Chapters Dropdown/Tabs + View Toggle */}
            <div className="lg:hidden mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-amber-900">📖 Life Chapters</h2>
                {/* View Mode Toggle - Cycles through all 3 views */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode(viewMode === 'chapters' ? 'feed' : viewMode === 'feed' ? 'timeline' : 'chapters')}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center space-x-1.5 font-medium text-sm"
                  >
                    {viewMode === 'chapters' && (
                      <>
                        <BookOpen size={14} />
                        <span>Chapters</span>
                      </>
                    )}
                    {viewMode === 'feed' && (
                      <>
                        <List size={14} />
                        <span>Feed</span>
                      </>
                    )}
                    {viewMode === 'timeline' && (
                      <>
                        <BarChart3 size={14} />
                        <span>Timeline</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {viewMode === 'chapters' && (
                <div className="bg-white rounded-2xl shadow-lg border-2 border-amber-200 p-4">
                  <label className="block text-sm font-semibold text-amber-900 mb-2">
                    Select Chapter
                  </label>
                  <select
                    value={selectedChapterId || ''}
                    onChange={(e) => setSelectedChapterId(e.target.value || null)}
                    className="w-full p-3 border-2 border-amber-300 rounded-xl bg-amber-50 text-slate-900 font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="">Choose a chapter...</option>
            {chapters
              .sort((a, b) => {
                const aDate = a.startDate ? new Date(a.startDate) : (a.createdAt ? new Date(a.createdAt) : new Date('1900-01-01'))
                const bDate = b.startDate ? new Date(b.startDate) : (b.createdAt ? new Date(b.createdAt) : new Date('1900-01-01'))
                const aTime = isNaN(aDate.getTime()) ? new Date('1900-01-01').getTime() : aDate.getTime()
                const bTime = isNaN(bDate.getTime()) ? new Date('1900-01-01').getTime() : bDate.getTime()
                return aTime - bTime
              })
              .map((chapter, index) => (
                      <option key={chapter.id} value={chapter.id}>
                        Chapter {index + 1}: {chapter.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Desktop: Left Sidebar - Chapters List (Table of Contents) */}
            <div className={`hidden lg:block ${viewMode === 'chapters' ? 'w-80' : 'w-0 opacity-0 pointer-events-none'} flex-shrink-0 transition-all duration-300`}>
              <div className="bg-white rounded-2xl shadow-lg border-2 border-amber-200 p-6 sticky top-8">
                <div className="mb-6 pb-4 border-b-2 border-amber-100">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-xl font-bold text-amber-900 flex items-center">
                      <span className="mr-2">📖</span>
                      Chapters
                    </h2>
                    <div className="flex items-center space-x-2">
                      {/* View Mode Toggle - Shows current mode, cycles through all 3 */}
                      <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                        <button
                          onClick={() => setViewMode('chapters')}
                          className={`p-1.5 rounded transition-colors ${viewMode === 'chapters' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                          title="Chapter View"
                        >
                          <BookOpen size={14} />
                        </button>
                        <button
                          onClick={() => setViewMode('feed')}
                          className={`p-1.5 rounded transition-colors ${viewMode === 'feed' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                          title="Feed View"
                        >
                          <List size={14} />
                        </button>
                        <button
                          onClick={() => setViewMode('timeline')}
                          className={`p-1.5 rounded transition-colors ${viewMode === 'timeline' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                          title="Timeline View"
                        >
                          <BarChart3 size={14} />
                        </button>
                      </div>
                      <button
                        onClick={onCreateGroup}
                        className="p-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                        title="Add new chapter"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-amber-700">{chapters.length} total</p>
                </div>
                
                {/* Chapters List */}
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                  {chapters
                    .sort((a, b) => {
                      // Robust chronological sorting
                const aDate = a.startDate ? new Date(a.startDate) : (a.createdAt ? new Date(a.createdAt) : new Date('1900-01-01'))
                const bDate = b.startDate ? new Date(b.startDate) : (b.createdAt ? new Date(b.createdAt) : new Date('1900-01-01'))
                
                const aTime = isNaN(aDate.getTime()) ? new Date('1900-01-01').getTime() : aDate.getTime()
                const bTime = isNaN(bDate.getTime()) ? new Date('1900-01-01').getTime() : bDate.getTime()
                
                return aTime - bTime
              })
                    .map((chapter, index) => {
                      const isSelected = selectedChapterId === chapter.id
                      return (
                        <button
                key={chapter.id} 
                          onClick={() => setSelectedChapterId(chapter.id)}
                          className={`w-full text-left p-4 rounded-xl transition-all duration-200 border-2 ${
                            isSelected 
                              ? 'bg-amber-100 border-amber-400 shadow-md' 
                              : 'bg-amber-50 border-amber-200 hover:bg-amber-100 hover:border-amber-300 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-xs font-semibold text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full">
                                  Chapter {index + 1}
                                </span>
                      </div>
                              <h3 className={`font-bold text-sm leading-tight ${
                                isSelected ? 'text-amber-900' : 'text-slate-800'
                              }`}>
                                {chapter.title}
                              </h3>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            {(chapter.startDate || chapter.endDate) && (
                              <div className="flex items-center space-x-1.5">
                                <Calendar size={12} className="text-amber-600" />
                                <span className="text-xs text-amber-700">
                                  {formatDateRange(chapter.startDate, chapter.endDate)}
                                </span>
                    </div>
                  )}
                  
                            <div className="flex items-center space-x-1.5">
                              <Users size={12} className="text-amber-600" />
                              <span className="text-xs text-amber-700">
                                {getMemoryCount(chapter.id)} {getMemoryCount(chapter.id) === 1 ? 'memory' : 'memories'}
                              </span>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                </div>
              </div>
            </div>

            {/* Right Panel - Chapter Content, Feed, or Timeline */}
            <div className="lg:flex-1 lg:min-w-0 w-full">
              {viewMode === 'timeline' ? (
                /* TIMELINE VIEW - Beautiful chronological visualization with bubbles */
                <ChronologicalTimelineView
                  memories={memories}
                  birthYear={(user as any)?.birthYear}
                  user={user ? { id: user.id, email: (user as any).email || '', birthYear: (user as any)?.birthYear } : null}
                  onStartCreating={onStartCreating}
                  onCreateChapter={onCreateGroup}
                  onZoomChange={(zoomLevel, currentYear, formatLabel, handlers) => {
                    // Timeline controls for zoom/navigation - can be exposed in header if needed
                    console.log('Timeline controls:', { zoomLevel, currentYear })
                  }}
                  onViewChange={(view) => setViewMode(view)}
                  highlightedMemories={new Set()}
                  voiceAddedMemories={new Set()}
                />
              ) : viewMode === 'feed' ? (
                /* FEED VIEW - All memories from all chapters */
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-slate-900">
                        All Memories
                      </h2>
                      <button
                        onClick={() => setViewMode('chapters')}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center space-x-2"
                        title="Switch to Chapter View"
                      >
                        <BookOpen size={16} />
                        <span className="hidden sm:inline">Chapter View</span>
                      </button>
                    </div>
                    <p className="text-slate-600 mb-4">
                      Showing {memories.length} memories from {chapters.length} chapters
                    </p>
                  </div>

                  {memories.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-lg border-2 border-dashed border-slate-200 p-12 text-center">
                      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">📝</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">No memories yet</h3>
                      <p className="text-slate-600">
                        Add memories to your chapters to see them here
                            </p>
                          </div>
                  ) : (
                    <div className="space-y-6">
                      {(() => {
                        // Sort memories by date
                        const sortedMemories = memories.sort((a, b) => {
                          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
                          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
                          return dateB - dateA
                        })
                        
                        // Group memories by date
                        const groupedByDate: { [key: string]: typeof memories } = {}
                        sortedMemories.forEach(memory => {
                          if (memory.createdAt) {
                            const date = new Date(memory.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                            if (!groupedByDate[date]) {
                              groupedByDate[date] = []
                            }
                            groupedByDate[date].push(memory)
                          }
                        })
                        
                        // Render grouped memories with date separators
                        return Object.entries(groupedByDate).map(([dateStr, dateMemories]) => {
                          // Format the date nicely
                          const firstMemory = dateMemories[0]
                          const date = new Date(firstMemory.createdAt!)
                          const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' })
                          const formattedDate = `${dayOfWeek}, ${dateStr}`
                          
                          return (
                            <div key={dateStr}>
                              {/* Date Separator */}
                              <div className="relative flex items-center justify-center my-8">
                                <div className="absolute inset-0 flex items-center">
                                  <div className="w-full border-t-2 border-slate-200"></div>
                            </div>
                                <div className="relative px-6 py-2 bg-gradient-to-r from-amber-50 to-slate-50 rounded-full border-2 border-slate-200 shadow-sm">
                                  <span className="text-sm font-bold text-slate-700 tracking-wide">
                                    {formattedDate}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Memories for this date */}
                              <div className="space-y-6">
                                {dateMemories.map((memory) => {
                                  // Find the chapter this memory belongs to
                                  const memoryChapter = chapters.find(ch => ch.id === memory.timeZoneId)
                                  
                                  return (
                            <div
                              key={memory.id}
                              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-200"
                            >
                              {/* Chapter Tag */}
                              {memoryChapter && (
                                <div className="mb-3">
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full border border-amber-200">
                                    <BookOpen size={12} />
                                    {memoryChapter.title}
                                  </span>
                            </div>
                          )}
                          
                              {/* Header with Title and Collaborator Badge */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="font-bold text-slate-900 text-xl mb-2">
                                    {memory.title || 'Untitled Memory'}
                                  </h4>
                                  <div className="flex items-center flex-wrap gap-2">
                                    {memory.createdAt && (
                                      <span className="text-sm text-slate-500">
                                        {new Date(memory.createdAt).toLocaleDateString('en-US', { 
                                          year: 'numeric', 
                                          month: 'long', 
                                          day: 'numeric' 
                                        })}
                                      </span>
                                    )}
                                    
                                    {memory.user && memory.userId !== user?.id && (
                                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full border border-amber-200">
                                        <Users size={12} />
                                        Added by {(memory.user as any).full_name || memory.user.email?.split('@')[0] || 'Collaborator'}
                                      </span>
                                    )}
                                    
                                    {memory.userId === user?.id && (
                                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full border border-purple-200">
                                        Added by you
                                      </span>
                                    )}
                            </div>
                                </div>
                                
                                {/* Action Buttons - Only show if user owns the memory */}
                                {memory.userId === user?.id && (
                                  <div className="flex items-center space-x-2 ml-4">
                                    {onEdit && (
                                      <button
                                        onClick={() => onEdit(memory)}
                                        className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Edit memory"
                                      >
                                        <Edit size={18} />
                                      </button>
                                    )}
                                    {onDelete && (
                                      <button
                                        onClick={() => onDelete(memory)}
                                        className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete memory"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              {memory.textContent && (
                                <p className="text-slate-700 leading-relaxed mb-4 text-base">
                                  {memory.textContent}
                                </p>
                              )}

                              {memory.media && memory.media.length > 0 && (
                                <div className="mt-4 space-y-3">
                                  {memory.media.map((mediaItem) => (
                                    <div key={mediaItem.id}>
                                      {mediaItem.type === 'IMAGE' && (
                                        <PhotoTagDisplay
                                          mediaId={mediaItem.id}
                                          imageUrl={mediaItem.storage_url}
                                          className="w-full max-w-full h-auto object-contain bg-slate-50 rounded-lg border border-slate-200"
                                          showTagsOnHover={true}
                                          showTagIndicator={true}
                                          onPersonClick={(personId, personName) => {
                                            console.log('🏷️ FEED: Person clicked:', personName, personId)
                                            if (onNavigateToMyPeople) {
                                              onNavigateToMyPeople()
                                            }
                                          }}
                                        />
                                      )}
                                      {mediaItem.type === 'VIDEO' && (
                                        <video 
                                          src={mediaItem.storage_url} 
                                          controls 
                                          className="w-full max-w-full rounded-lg"
                                        />
                                      )}
                                      {mediaItem.type === 'AUDIO' && (
                                        <audio 
                                          src={mediaItem.storage_url} 
                                          controls 
                                          className="w-full"
                                        />
                                      )}
                          </div>
                                  ))}
                        </div>
                              )}

                              {(memory as any).categories && (memory as any).categories.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {(memory as any).categories.map((category: string, index: number) => (
                                    <span 
                                      key={index}
                                      className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full"
                                    >
                                      {category}
                                    </span>
                                  ))}
                      </div>
                              )}

                              <div className="mt-6 pt-4 border-t border-slate-200">
                                <MemoryContributions 
                                  memoryId={memory.id}
                                  memoryTitle={memory.title || 'this memory'}
                                  onNavigateToMyPeople={onNavigateToMyPeople}
                                />
                    </div>
                            </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  )}
                </div>
              ) : selectedChapter ? (
                <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200 overflow-hidden">
                  {/* Chapter Header */}
                  <div className="relative">
                    {/* Header Image */}
                    {selectedChapter.headerImageUrl ? (
                      <div className="relative h-48 sm:h-64 bg-gradient-to-br from-slate-100 to-slate-200">
                        <img
                          src={selectedChapter.headerImageUrl}
                          alt={selectedChapter.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      </div>
                    ) : (
                      <div className="h-32 sm:h-48 bg-gradient-to-br from-amber-100 via-amber-50 to-slate-100"></div>
                    )}
                    
                    {/* Chapter Title Overlay */}
                    <div className={`${selectedChapter.headerImageUrl ? 'absolute bottom-0 left-0 right-0' : ''} p-4 sm:p-8 ${selectedChapter.headerImageUrl ? 'text-white' : 'text-slate-900'}`}>
                      <h2 className="text-2xl sm:text-3xl font-bold mb-2">{selectedChapter.title}</h2>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                        {(selectedChapter.startDate || selectedChapter.endDate) && (
                          <div className="flex items-center space-x-2">
                            <Calendar size={16} />
                            <span>{formatDateRange(selectedChapter.startDate, selectedChapter.endDate)}</span>
                          </div>
                        )}
                        {selectedChapter.location && (
                          <div className="flex items-center space-x-2">
                            <MapPin size={16} />
                            <span>{selectedChapter.location}</span>
                        </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex items-center space-x-2">
                    <button
                        onClick={() => handleEditChapter(selectedChapter)}
                      className="bg-white/90 hover:bg-white text-slate-700 p-2 rounded-lg shadow-lg transition-all duration-200"
                      title="Edit Chapter"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                        onClick={() => handleDeleteChapter(selectedChapter.id, selectedChapter.title)}
                      className="bg-red-500/90 hover:bg-red-500 text-white p-2 rounded-lg shadow-lg transition-all duration-200"
                      title="Delete Chapter"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                  {/* Chapter Description */}
                  {selectedChapter.description && (
                    <div className="px-4 sm:px-8 py-4 sm:py-6 bg-amber-50 border-b border-amber-100">
                      <p className="text-slate-700 leading-relaxed text-sm sm:text-base">{selectedChapter.description}</p>
                    </div>
                  )}

                  {/* Memories Section */}
                  <div className="p-4 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                        <h3 className="text-xl font-bold text-slate-900">
                          Memories from this chapter
                  </h3>
                  
                        {/* Collaborators - Google Drive style overlapping avatars */}
                        <button
                          onClick={() => {
                            setCollaboratorsChapter(selectedChapter)
                            setShowCollaboratorsModal(true)
                            fetchNetworkCollaborators(selectedChapter.id)
                          }}
                          className="flex items-center hover:opacity-80 transition-opacity"
                          title="View and manage collaborators"
                        >
                          <div className="flex -space-x-2">
                            {/* You (Creator) */}
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 border-2 border-white flex items-center justify-center shadow-md">
                              <span className="text-white text-xs font-bold">You</span>
                            </div>
                            
                            {/* Registered members - show all */}
                            {selectedChapter.members && selectedChapter.members.length > 0 && 
                              selectedChapter.members.map((member, index) => (
                                <div 
                                  key={member.id || index}
                                  className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white flex items-center justify-center shadow-md"
                                  title="Registered member"
                                >
                                  <span className="text-white text-xs font-bold">
                                    {index + 1}
                      </span>
                    </div>
                              ))
                            }
                            
                            {/* Network collaborators (pending) - show all */}
                            {(() => {
                              // Find all network people who have access to this chapter
                              // This will be populated when the modal is opened, but we can also check here
                              const networkWithAccess = networkCollaborators.length > 0 ? networkCollaborators : []
                              return networkWithAccess.map((person, index) => (
                                <div 
                                  key={person.id}
                                  className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-white flex items-center justify-center shadow-md"
                                  title={`${person.person_name} (Pending)`}
                                >
                                  <Users size={14} className="text-white" />
                      </div>
                              ))
                            })()}
                            
                            {/* Add collaborator button */}
                            <div className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 border-2 border-white flex items-center justify-center shadow-md transition-colors">
                              <Plus size={14} className="text-slate-600" />
                    </div>
                          </div>
                        </button>
                  </div>

                  {onStartCreating && (
                      <button
                          onClick={() => onStartCreating(selectedChapter.id, selectedChapter.title)}
                          className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                      >
                        <Plus size={16} />
                          <span>Add Memory</span>
                      </button>
                      )}
                    </div>

                    {selectedChapterMemories.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                          <span className="text-2xl">💭</span>
                        </div>
                        <p className="text-slate-600 mb-4">No memories in this chapter yet</p>
                        {onStartCreating && (
                      <button
                            onClick={() => onStartCreating(selectedChapter.id, selectedChapter.title)}
                            className="bg-sky-600 hover:bg-sky-700 text-white py-2 px-6 rounded-lg text-sm font-medium transition-all duration-200"
                      >
                            Add your first memory
                      </button>
                        )}
                          </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedChapterMemories
                          .sort((a, b) => {
                            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
                            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
                            return dateB - dateA
                          })
                          .map((memory) => (
                            <div
                              key={memory.id}
                              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-200"
                            >
                              {/* Header with Title and Collaborator Badge */}
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="font-bold text-slate-900 text-xl mb-2">
                                    {memory.title || 'Untitled Memory'}
                                  </h4>
                                  <div className="flex items-center flex-wrap gap-2">
                                    {/* Date */}
                                    {memory.createdAt && (
                                      <span className="text-sm text-slate-500">
                                        {new Date(memory.createdAt).toLocaleDateString('en-US', { 
                                          year: 'numeric', 
                                          month: 'long', 
                                          day: 'numeric' 
                                        })}
                                      </span>
                                    )}
                                    
                                    {/* Creator Badge */}
                                    {memory.user && memory.userId !== user?.id && (
                                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-full border border-amber-200">
                                        <Users size={12} />
                                        Added by {(memory.user as any).full_name || memory.user.email?.split('@')[0] || 'Collaborator'}
                                      </span>
                                    )}
                                    
                                    {memory.userId === user?.id && (
                                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full border border-purple-200">
                                        Added by you
                                      </span>
                                    )}
                          </div>
                        </div>
                        
                                {/* Action Buttons - Only show if user owns the memory */}
                                {memory.userId === user?.id && (
                                  <div className="flex items-center space-x-2 ml-4">
                                    {onEdit && (
                    <button
                                        onClick={() => onEdit(memory)}
                                        className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Edit memory"
                    >
                                        <Edit size={18} />
                    </button>
                                    )}
                                    {onDelete && (
                                      <button
                                        onClick={() => onDelete(memory)}
                                        className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete memory"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                    )}
                  </div>
                                )}
                </div>
                        
                              {/* Description */}
                              {memory.textContent && (
                                <p className="text-slate-700 leading-relaxed mb-4 text-base">
                                  {memory.textContent}
                                </p>
                              )}

                              {/* Media */}
                              {memory.media && memory.media.length > 0 && (
                                <div className="mt-4 space-y-3">
                                  {memory.media.map((mediaItem) => (
                                    <div key={mediaItem.id}>
                                      {mediaItem.type === 'IMAGE' && (
                                        <PhotoTagDisplay
                                          mediaId={mediaItem.id}
                                          imageUrl={mediaItem.storage_url}
                                          className="w-full max-w-full h-auto object-contain bg-slate-50 rounded-lg border border-slate-200"
                                          showTagsOnHover={true}
                                          showTagIndicator={true}
                                          onPersonClick={(personId, personName) => {
                                            console.log('🏷️ CHAPTER: Person clicked:', personName, personId)
                                            if (onNavigateToMyPeople) {
                                              onNavigateToMyPeople()
                                            }
                                          }}
                                        />
                                      )}
                                      {mediaItem.type === 'VIDEO' && (
                                        <video 
                                          src={mediaItem.storage_url} 
                                          controls 
                                          className="w-full max-w-full rounded-lg"
                                        />
                                      )}
                                      {mediaItem.type === 'AUDIO' && (
                                        <audio 
                                          src={mediaItem.storage_url} 
                                          controls 
                                          className="w-full"
                                        />
                                      )}
              </div>
            ))}
                    </div>
                              )}

                              {/* Categories/Tags */}
                              {(memory as any).categories && (memory as any).categories.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                  {(memory as any).categories.map((category: string, index: number) => (
                                    <span 
                                      key={index}
                                      className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full"
                                    >
                                      {category}
                                    </span>
                                  ))}
                  </div>
                              )}

                              {/* Memory Contributions (Comments, Additions, Corrections) */}
                              <div className="mt-6 pt-4 border-t border-slate-200">
                                <MemoryContributions 
                                  memoryId={memory.id}
                                  memoryTitle={memory.title || 'this memory'}
                                  onNavigateToMyPeople={onNavigateToMyPeople}
                                />
                </div>
              </div>
            ))}
                  </div>
                    )}
                </div>
              </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-lg border-2 border-dashed border-slate-200 p-12 text-center h-full flex items-center justify-center">
                  <div>
                    <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <span className="text-4xl">📖</span>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-3">Select a chapter</h3>
                    <p className="text-slate-600 max-w-md mx-auto">
                      Choose a chapter from the left to view its memories and details
                </p>
              </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Edit Chapter Modal */}
      {editingChapter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 flex-shrink-0">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-900">Edit Chapter</h2>
                {/* Auto-save status indicator */}
                <div className="flex items-center space-x-2 mt-1">
                  {isAutoSaving ? (
                    <div className="flex items-center space-x-1 text-blue-600 text-sm">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                      <span>Auto-saving...</span>
                    </div>
                  ) : lastSaved && !hasUnsavedChanges ? (
                    <div className="flex items-center space-x-1 text-green-600 text-sm">
                      <CheckCircle size={14} />
                      <span>Saved {lastSaved.toLocaleTimeString()}</span>
                    </div>
                  ) : hasUnsavedChanges ? (
                    <div className="flex items-center space-x-1 text-amber-600 text-sm">
                      <AlertCircle size={14} />
                      <span>Unsaved changes</span>
                    </div>
                  ) : null}
                  {autoSaveError && (
                    <div className="flex items-center space-x-1 text-red-600 text-sm">
                      <AlertCircle size={14} />
                      <span>Auto-save failed</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={handleCloseEdit}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title={hasUnsavedChanges ? "You have unsaved changes" : "Close"}
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
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
                  <div className="bg-white border border-slate-300 rounded-xl shadow-sm">
                    <DatePicker
                      selected={editingChapter.startDate ? new Date(editingChapter.startDate) : null}
                      onChange={(date) => {
                        if (date) {
                          setEditingChapter({ ...editingChapter, startDate: date.toISOString().split('T')[0] })
                        }
                      }}
                      dateFormat="MMMM d, yyyy"
                      showPopperArrow={false}
                      placeholderText="Select start date"
                      className="w-full px-4 py-3 text-slate-900 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500"
                      wrapperClassName="w-full"
                      calendarClassName="shadow-lg border border-slate-200 rounded-lg"
                      showMonthDropdown
                      showYearDropdown
                      dropdownMode="select"
                      yearDropdownItemNumber={100}
                      scrollableYearDropdown
                      maxDate={new Date()}
                      popperPlacement="bottom-start"
                      popperModifiers={[
                        {
                          name: 'offset',
                          options: {
                            offset: [0, 8],
                          },
                        },
                        {
                          name: 'preventOverflow',
                          options: {
                            rootBoundary: 'viewport',
                            tether: false,
                            altAxis: true,
                          },
                        },
                      ] as any}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">End Date</label>
                  <div className="bg-white border border-slate-300 rounded-xl shadow-sm">
                    <DatePicker
                      selected={editingChapter.endDate ? new Date(editingChapter.endDate) : null}
                      onChange={(date) => {
                        if (date) {
                          setEditingChapter({ ...editingChapter, endDate: date.toISOString().split('T')[0] })
                        }
                      }}
                      dateFormat="MMMM d, yyyy"
                      showPopperArrow={false}
                      placeholderText="Select end date"
                      minDate={editingChapter.startDate ? new Date(editingChapter.startDate) : undefined}
                      className="w-full px-4 py-3 text-slate-900 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500"
                      wrapperClassName="w-full"
                      calendarClassName="shadow-lg border border-slate-200 rounded-lg"
                      showMonthDropdown
                      showYearDropdown
                      dropdownMode="select"
                      yearDropdownItemNumber={100}
                      scrollableYearDropdown
                      maxDate={new Date()}
                      popperPlacement="bottom-start"
                      popperModifiers={[
                        {
                          name: 'offset',
                          options: {
                            offset: [0, 8],
                          },
                        },
                        {
                          name: 'preventOverflow',
                          options: {
                            rootBoundary: 'viewport',
                            tether: false,
                            altAxis: true,
                          },
                        },
                      ] as any}
                    />
                  </div>
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

            {/* Collaboration Section */}
            <div className="border-t border-slate-200 pt-6 px-6 mt-2">
              <InviteCollaborators 
                chapterId={editingChapter.id}
                chapterTitle={editingChapter.title}
                onInviteSent={() => {
                  // Optionally refresh chapter data to show new members
                  fetchChaptersAndMemories()
                }}
                onNavigateToMyPeople={onNavigateToMyPeople}
              />
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end p-6 border-t border-slate-200 flex-shrink-0 mt-2">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleCloseEdit}
                  className="px-6 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
                  disabled={isUpdating}
                >
                  {hasUnsavedChanges ? 'Close Anyway' : 'Close'}
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
                      <span>Save & Close</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collaborators Modal */}
      {showCollaboratorsModal && collaboratorsChapter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[80vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Share Chapter</h2>
                <p className="text-sm text-slate-600 mt-1">{collaboratorsChapter.title}</p>
              </div>
              <button
                onClick={() => {
                  setShowCollaboratorsModal(false)
                  setCollaboratorsChapter(null)
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Current Collaborators */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">People with access</h3>
                <div className="space-y-2">
                  {/* You (Owner) */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                        <span className="text-white text-sm font-bold">You</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{user?.email}</p>
                        <p className="text-xs text-slate-500">Owner</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded-full">Full access</span>
                  </div>

                  {/* Registered Members */}
                  {collaboratorsChapter.members && collaboratorsChapter.members.length > 0 && 
                    collaboratorsChapter.members.map((member, index) => (
                      <div key={member.id || index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                            <span className="text-white text-sm font-bold">{index + 1}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">Collaborator {index + 1}</p>
                            <p className="text-xs text-slate-500">Member</p>
                          </div>
                        </div>
                        <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded-full">Can view & edit</span>
                      </div>
                    ))
                  }

                  {/* Network Collaborators (Pending Invitations) */}
                  {networkCollaborators.map((person, index) => (
                    <div key={person.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                          <Users size={18} className="text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{person.person_name}</p>
                          <p className="text-xs text-amber-700">Invited from My People</p>
                        </div>
                      </div>
                      <span className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded-full">Pending</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Invite Section */}
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Invite to collaborate</h3>
                <InviteCollaborators 
                  chapterId={collaboratorsChapter.id}
                  chapterTitle={collaboratorsChapter.title}
                  onInviteSent={async () => {
                    // Refresh network collaborators to show newly added people
                    await fetchNetworkCollaborators(collaboratorsChapter.id)
                  }}
                  onNavigateToMyPeople={onNavigateToMyPeople}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end p-6 border-t border-slate-200">
              <button
                onClick={() => {
                  setShowCollaboratorsModal(false)
                  setCollaboratorsChapter(null)
                }}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium transition-colors"
              >
                Done
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
      
      {/* Fixed bottom button for creating first chapter - Shows when no chapters exist */}
      {isMounted && chapters.length === 0 && createPortal(
        <div 
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg overflow-x-hidden"
          style={{
            position: 'fixed',
            zIndex: 9999,
            transform: 'translate3d(0, 0, 0)',
            WebkitTransform: 'translate3d(0, 0, 0)',
            willChange: 'transform'
          }}
        >
          <div className="max-w-2xl mx-auto px-4">
            <button
              onClick={onCreateGroup}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white px-4 sm:px-8 py-4 rounded-xl text-base sm:text-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 sm:space-x-3 shadow-lg hover:shadow-xl active:scale-95 min-w-0"
            >
              <span className="text-xl flex-shrink-0">📖</span>
              <span className="truncate">Create Your First Chapter</span>
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Mobile Floating Action Button (FAB) with Menu - Shows when chapters exist */}
      {isMounted && chapters.length > 0 && createPortal(
        <div className="sm:hidden">
          {/* Backdrop when menu is open */}
          {isFabOpen && (
            <div 
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-200"
              onClick={() => setIsFabOpen(false)}
            />
          )}

          {/* FAB Menu Options */}
          {isFabOpen && (
            <div className="fixed bottom-24 right-6 z-50 space-y-3 animate-fade-in">
              {/* Add Memory Option - Only show if there's a selected chapter or chapters exist */}
              {(selectedChapterId || chapters.length > 0) && onStartCreating && (
                <button
                  onClick={() => {
                    const targetChapter = selectedChapterId 
                      ? chapters.find(ch => ch.id === selectedChapterId)
                      : chapters[0] // Default to first chapter if none selected
                    onStartCreating(targetChapter?.id, targetChapter?.title)
                    setIsFabOpen(false)
                  }}
                  className="flex items-center space-x-3 bg-white text-slate-900 px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  <div className="w-10 h-10 bg-sky-600 rounded-full flex items-center justify-center">
                    <Camera size={18} className="text-white" />
                  </div>
                  <span className="font-medium pr-2">
                    {selectedChapterId && chapters.find(ch => ch.id === selectedChapterId)
                      ? `Add to ${chapters.find(ch => ch.id === selectedChapterId)!.title.length > 15 
                          ? chapters.find(ch => ch.id === selectedChapterId)!.title.substring(0, 15) + '...' 
                          : chapters.find(ch => ch.id === selectedChapterId)!.title}`
                      : 'Add Memory'}
                  </span>
                </button>
              )}

              {/* New Chapter Option */}
              {onCreateGroup && (
            <button
                  onClick={() => {
                    onCreateGroup()
                    setIsFabOpen(false)
                  }}
                  className="flex items-center space-x-3 bg-white text-slate-900 px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                >
                  <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center">
                    <BookOpen size={18} className="text-white" />
                  </div>
                  <span className="font-medium pr-2">New Chapter</span>
            </button>
              )}
          </div>
          )}

          {/* Main FAB Button */}
          <button
            onClick={() => setIsFabOpen(!isFabOpen)}
            className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-50 ${
              isFabOpen 
                ? 'bg-slate-900 rotate-45' 
                : 'bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600'
            }`}
            style={{
              transform: isFabOpen ? 'rotate(45deg) scale(1.05)' : 'rotate(0deg) scale(1)',
            }}
          >
            <Plus size={24} className="text-white" />
          </button>
        </div>,
        document.body
      )}
      
      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  )
} 