'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, MapPin, Upload, X, Image as ImageIcon, Film, Mic, Plus, Crown, Sparkles } from 'lucide-react'
import VoiceRecorder from './VoiceRecorder'
import UpgradeModal from './UpgradeModal'
import { useAuth } from './AuthProvider'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import '@/styles/datepicker.css'

interface Memory {
  id: string
  title: string
  content: string
  memoryDate: string
  datePrecision?: 'exact' | 'approximate' | 'era'
  approximateDate?: string
  userId: string
  timeZoneId?: string
  createdAt: string
}

interface TimeZone {
  id: string
  title: string
  type: 'PERSONAL' | 'GROUP'
  startDate?: string
  endDate?: string
  location?: string
}

interface CreateMemoryProps {
  onMemoryCreated?: (memory: Memory) => void
}

export default function CreateMemory({ onMemoryCreated }: CreateMemoryProps) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [memoryDate, setMemoryDate] = useState<Date | null>(null)
  const [memoryTime, setMemoryTime] = useState('')
  const [datePrecision, setDatePrecision] = useState<'exact' | 'approximate' | 'era'>('exact')
  const [approximateDate, setApproximateDate] = useState('')
  const [approximateYear, setApproximateYear] = useState('')
  const [approximateSeason, setApproximateSeason] = useState('')
  const [selectedTimeZone, setSelectedTimeZone] = useState('')
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [timeZones, setTimeZones] = useState<TimeZone[]>([])
  const [isLoadingTimeZones, setIsLoadingTimeZones] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Image positioning state for each file
  const [filePreviewUrls, setFilePreviewUrls] = useState<{[key: string]: string}>({})
  const [filePositioning, setFilePositioning] = useState<{[key: string]: {
    zoom: number
    position: { x: number, y: number }
    isDragging: boolean
    dragStart: { x: number, y: number }
  }}>({})
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  
  // New Group Creation States
  const [newGroupTitle, setNewGroupTitle] = useState('')
  const [newGroupStartDate, setNewGroupStartDate] = useState('')
  const [newGroupEndDate, setNewGroupEndDate] = useState('')
  const [newGroupLocation, setNewGroupLocation] = useState('')
  const [newGroupType, setNewGroupType] = useState<'PERSONAL' | 'GROUP'>('GROUP')
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [groupDatePrecision, setGroupDatePrecision] = useState<'exact' | 'estimated'>('estimated')
  const [groupStartYear, setGroupStartYear] = useState('')
  const [groupEndYear, setGroupEndYear] = useState('')
  const [newGroupDescription, setNewGroupDescription] = useState('')
  const [newGroupImage, setNewGroupImage] = useState<File | null>(null)
  const [isPremiumUser, setIsPremiumUser] = useState(false)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [premiumLoading, setPremiumLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(filePreviewUrls).forEach(url => URL.revokeObjectURL(url))
    }
  }, [filePreviewUrls])

  useEffect(() => {
    const fetchTimeZones = async () => {
      try {
        const token = getAuthToken()
        if (!token) {
          console.error('No auth token found for timezone fetch')
          return
        }

        const response = await fetch('/api/timezones', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setTimeZones(data.data || data) // Handle both possible response formats
        } else {
          console.error('Failed to fetch timezones:', response.status)
        }
      } catch (error) {
        console.error('Error fetching time zones:', error)
      } finally {
        setIsLoadingTimeZones(false)
      }
    }

    fetchTimeZones()
    checkPremiumStatus()
  }, [])

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
      console.log('📡 CREATE MEMORY: Getting auth token for premium status check...')
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      if (!tokenResponse.ok) {
        console.error('❌ CREATE MEMORY: Failed to get auth token for premium check')
        throw new Error('Failed to get auth token')
      }

      const { token } = await tokenResponse.json()
      console.log('✅ CREATE MEMORY: Got auth token for premium check')

      console.log('📡 CREATE MEMORY: Calling /api/user/premium-status with JWT token...')
      const response = await fetch('/api/user/premium-status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      })

      console.log('📊 CREATE MEMORY: Premium status response:', response.status, response.ok)

      if (response.ok) {
        const data = await response.json()
        console.log('📊 CREATE MEMORY: Premium status data:', data)
        setIsPremiumUser(data.isPremium)
        console.log('🔄 CREATE MEMORY: Premium status updated:', data.isPremium)
      } else {
        console.error('❌ CREATE MEMORY: Premium status check failed:', response.status)
      }
    } catch (error) {
      console.error('❌ CREATE MEMORY: Error checking premium status:', error)
    } finally {
      setPremiumLoading(false)
      console.log('✅ CREATE MEMORY: Premium status check completed')
    }
  }

  const getAuthToken = () => {
    // First try to get from cookies (consistent with other components)
    const cookies = document.cookie.split(';')
    const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth-token='))
    if (authCookie) {
      return authCookie.split('=')[1]
    }
    
    // Fallback to localStorage for backward compatibility
    const localToken = localStorage.getItem('token')
    if (localToken) {
      return localToken
    }
    
    return null
  }

  const handleVoiceRecord = () => {
    if (!isPremiumUser) {
      setShowUpgradeModal(true)
      return
    }
    
    setShowVoiceRecorder(true)
  }

  const handleVoiceTranscription = (transcribedText: string) => {
    setContent(prev => prev ? `${prev}\n\n${transcribedText}` : transcribedText)
    setShowVoiceRecorder(false)
  }

  const handleCreateGroup = async () => {
    if (!newGroupTitle.trim()) return

    setIsCreatingGroup(true)
    try {
      const token = getAuthToken()
      if (!token) return

      // Prepare dates based on precision
      let startDate: string | undefined
      let endDate: string | undefined

      if (groupDatePrecision === 'estimated') {
        if (groupStartYear) {
          startDate = `${groupStartYear}-01-01`
        }
        if (groupEndYear && groupEndYear !== 'ongoing') {
          endDate = `${groupEndYear}-12-31`
        }
      } else {
        startDate = newGroupStartDate || undefined
        endDate = newGroupEndDate || undefined
      }

      const response = await fetch('/api/timezones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newGroupTitle,
          type: newGroupType,
          startDate,
          endDate,
          location: newGroupLocation || undefined,
          description: newGroupDescription || undefined,
        }),
      })

      if (response.ok) {
        const newGroup = await response.json()
        setTimeZones(prev => [...prev, newGroup])
        setSelectedTimeZone(newGroup.id)
        setShowCreateGroup(false)
        // Reset form
        setNewGroupTitle('')
        setNewGroupStartDate('')
        setNewGroupEndDate('')
        setNewGroupLocation('')
        setNewGroupType('GROUP')
        setGroupDatePrecision('estimated')
        setGroupStartYear('')
        setGroupEndYear('')
        setNewGroupDescription('')
        setNewGroupImage(null)
      }
    } catch (error) {
      console.error('Error creating group:', error)
    } finally {
      setIsCreatingGroup(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      
      // Create preview URLs and initial positioning for image files
      newFiles.forEach((file, index) => {
        if (file.type.startsWith('image/')) {
          const fileKey = `${file.name}-${file.size}-${file.lastModified}`
          const previewUrl = URL.createObjectURL(file)
          
          setFilePreviewUrls(prev => ({
            ...prev,
            [fileKey]: previewUrl
          }))
          
          // Calculate initial zoom to show full image
          const img = new Image()
          img.onload = () => {
            const previewWidth = 320 // Standard preview width
            const previewHeight = 240 // Standard preview height
            const imgAspect = img.naturalWidth / img.naturalHeight
            const previewAspect = previewWidth / previewHeight
            
            let initialZoom
            if (imgAspect > previewAspect) {
              // Image is wider - fit to width to see full image
              initialZoom = previewWidth / img.naturalWidth
            } else {
              // Image is taller - fit to height to see full image  
              initialZoom = previewHeight / img.naturalHeight
            }
            
            // Make sure zoom doesn't go below minimum
            initialZoom = Math.max(0.05, Math.min(1, initialZoom))
            
            setFilePositioning(prev => ({
              ...prev,
              [fileKey]: {
                zoom: initialZoom,
                position: { x: 0, y: 0 },
                isDragging: false,
                dragStart: { x: 0, y: 0 }
              }
            }))
          }
          img.src = previewUrl
        }
      })
      
      setMediaFiles(prev => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    const file = mediaFiles[index]
    if (file && file.type.startsWith('image/')) {
      const fileKey = `${file.name}-${file.size}-${file.lastModified}`
      // Clean up preview URL and positioning data
      if (filePreviewUrls[fileKey]) {
        URL.revokeObjectURL(filePreviewUrls[fileKey])
      }
      setFilePreviewUrls(prev => {
        const newUrls = { ...prev }
        delete newUrls[fileKey]
        return newUrls
      })
      setFilePositioning(prev => {
        const newPositioning = { ...prev }
        delete newPositioning[fileKey]
        return newPositioning
      })
    }
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
  }

  // Image positioning handlers
  const getFileKey = (file: File) => `${file.name}-${file.size}-${file.lastModified}`

  const handleImageMouseDown = (fileKey: string, e: React.MouseEvent) => {
    const positioning = filePositioning[fileKey]
    if (!positioning) return
    
    setFilePositioning(prev => ({
      ...prev,
      [fileKey]: {
        ...positioning,
        isDragging: true,
        dragStart: { x: e.clientX - positioning.position.x, y: e.clientY - positioning.position.y }
      }
    }))
  }

  const handleImageMouseMove = (fileKey: string, e: React.MouseEvent) => {
    const positioning = filePositioning[fileKey]
    if (!positioning?.isDragging) return
    
    const newX = e.clientX - positioning.dragStart.x
    const newY = e.clientY - positioning.dragStart.y
    
    // Add boundary checking
    const previewWidth = 320
    const previewHeight = 240
    const imageWidth = previewWidth * positioning.zoom
    const imageHeight = previewHeight * positioning.zoom
    
    const minX = -(imageWidth - previewWidth)
    const maxX = 0
    const minY = -(imageHeight - previewHeight)
    const maxY = 0
    
    setFilePositioning(prev => ({
      ...prev,
      [fileKey]: {
        ...positioning,
        position: {
          x: Math.max(minX, Math.min(maxX, newX)),
          y: Math.max(minY, Math.min(maxY, newY))
        }
      }
    }))
  }

  const handleImageMouseUp = (fileKey: string) => {
    const positioning = filePositioning[fileKey]
    if (!positioning) return
    
    setFilePositioning(prev => ({
      ...prev,
      [fileKey]: {
        ...positioning,
        isDragging: false
      }
    }))
  }

  const handleImageZoomChange = (fileKey: string, newZoom: number) => {
    const positioning = filePositioning[fileKey]
    if (!positioning) return
    
    const minZoom = 0.05
    const maxZoom = 5
    const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom))
    
    // Adjust position to keep image in bounds when zoom changes
    const previewWidth = 320
    const previewHeight = 240
    const imageWidth = previewWidth * clampedZoom
    const imageHeight = previewHeight * clampedZoom
    
    const minX = -(imageWidth - previewWidth)
    const maxX = 0
    const minY = -(imageHeight - previewHeight)
    const maxY = 0
    
    setFilePositioning(prev => ({
      ...prev,
      [fileKey]: {
        ...positioning,
        zoom: clampedZoom,
        position: {
          x: Math.max(minX, Math.min(maxX, positioning.position.x)),
          y: Math.max(minY, Math.min(maxY, positioning.position.y))
        }
      }
    }))
  }

  const resetImagePositioning = (fileKey: string) => {
    setFilePositioning(prev => ({
      ...prev,
      [fileKey]: {
        ...prev[fileKey],
        zoom: 1,
        position: { x: 0, y: 0 }
      }
    }))
  }

  // Create cropped image based on current position and zoom
  const createCroppedImage = (file: File, fileKey: string): Promise<File | null> => {
    return new Promise((resolve) => {
      const previewUrl = filePreviewUrls[fileKey]
      const positioning = filePositioning[fileKey]
      
      if (!previewUrl || !positioning) {
        resolve(null)
        return
      }

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(null)
        return
      }

      const img = new Image()
      img.onload = () => {
        // Set canvas to standard dimensions for memory images
        canvas.width = 800  // Good resolution for memory images
        canvas.height = 600 // 4:3 aspect ratio

        // Calculate how the image fits in the preview container
        const previewHeight = 240
        const previewWidth = 320
        const imgAspect = img.naturalWidth / img.naturalHeight
        const previewAspect = previewWidth / previewHeight

        let displayWidth, displayHeight
        if (imgAspect > previewAspect) {
          // Image is wider, fit to height
          displayHeight = previewHeight
          displayWidth = displayHeight * imgAspect
        } else {
          // Image is taller, fit to width
          displayWidth = previewWidth
          displayHeight = displayWidth / imgAspect
        }

        // Scale according to zoom
        const scaledWidth = displayWidth * positioning.zoom
        const scaledHeight = displayHeight * positioning.zoom

        // Fill the entire canvas
        ctx.fillStyle = '#f1f5f9' // slate-100 background
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Draw the positioned and scaled image
        ctx.drawImage(
          img,
          positioning.position.x,
          positioning.position.y,
          scaledWidth,
          scaledHeight
        )

        // Convert canvas to blob and then to File
        canvas.toBlob((blob) => {
          if (blob) {
            const croppedFile = new File([blob], `cropped-${file.name}`, { type: 'image/jpeg' })
            resolve(croppedFile)
          } else {
            resolve(null)
          }
        }, 'image/jpeg', 0.9)
      }
      
      img.src = previewUrl
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const token = getAuthToken()
      if (!token) {
        console.error('No auth token found')
        return
      }

      const formData = new FormData()
      formData.append('title', title)
      formData.append('textContent', content)  // Changed from 'content' to 'textContent'
      
      if (datePrecision === 'exact' && memoryDate) {
        const dateObj = new Date(memoryDate)
        if (memoryTime) {
          const [hours, minutes] = memoryTime.split(':')
          dateObj.setHours(parseInt(hours), parseInt(minutes))
        } else {
          dateObj.setHours(12, 0) // Default to noon if no time specified
        }
        if (isNaN(dateObj.getTime())) {
          alert('Invalid date selected. Please check your date and time.')
          return
        }
        formData.append('customDate', dateObj.toISOString())  // Changed from 'memoryDate' to 'customDate'
      } else if (datePrecision === 'approximate') {
        formData.append('approximateDate', approximateDate || `${approximateSeason} ${approximateYear}`.trim())
        if (approximateYear) {
          const yearNum = parseInt(approximateYear)
          if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
            alert('Invalid year. Please enter a year between 1900 and 2100.')
            return
          }
          const dateObj = new Date(`${yearNum}-06-15`)
          if (isNaN(dateObj.getTime())) {
            alert('Invalid year selected.')
            return
          }
          formData.append('customDate', dateObj.toISOString())  // Changed from 'memoryDate' to 'customDate'
        }
      } else if (datePrecision === 'era' && selectedTimeZone) {
        const timeZone = timeZones.find(tz => tz.id === selectedTimeZone)
        if (timeZone?.startDate) {
          formData.append('customDate', timeZone.startDate)  // Changed from 'memoryDate' to 'customDate'
          formData.append('approximateDate', `During ${timeZone.title}`)
        }
      }
      
      formData.append('datePrecision', datePrecision)
      if (selectedTimeZone) {
        formData.append('timeZoneId', selectedTimeZone)
      }

      // Process media files - crop images if positioned, keep videos/audio as-is
      for (let i = 0; i < mediaFiles.length; i++) {
        const file = mediaFiles[i]
        const fileKey = getFileKey(file)
        
        if (file.type.startsWith('image/') && filePositioning[fileKey]) {
          const positioning = filePositioning[fileKey]
          // If user has positioned/zoomed the image, create cropped version
          if (positioning.zoom !== 1 || positioning.position.x !== 0 || positioning.position.y !== 0) {
            const croppedImage = await createCroppedImage(file, fileKey)
            if (croppedImage) {
              formData.append('media', croppedImage)
            } else {
              formData.append('media', file) // Fallback to original
            }
          } else {
            formData.append('media', file) // Use original if not positioned
          }
        } else {
          formData.append('media', file) // Videos, audio, or non-positioned images
        }
      }

      const response = await fetch('/api/memories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        if (onMemoryCreated) {
          onMemoryCreated(result.data)
        }
        
        // Reset form
        setTitle('')
        setContent('')
        setMemoryDate('')
        setMemoryTime('')
        setApproximateDate('')
        setApproximateYear('')
        setApproximateSeason('')
        setSelectedTimeZone('')
        setMediaFiles([])
        
        // Clean up image preview URLs and positioning data
        Object.values(filePreviewUrls).forEach(url => URL.revokeObjectURL(url))
        setFilePreviewUrls({})
        setFilePositioning({})
        setEditingImageIndex(null)
        setDatePrecision('exact')
      } else {
        const errorData = await response.json()
        console.error('Error creating memory:', errorData)
        alert('Failed to create memory: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error creating memory:', error)
      alert('Failed to create memory. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8 pb-32">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create New Memory</h1>
          <p className="text-gray-600">Capture and share your life moments</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          


          {/* Main Content - Responsive Layout */}
          <div className="grid lg:grid-cols-2 gap-6">
            
            {/* Left Column - Memory Content */}
            <div className="space-y-6">
              
              {/* Title & Content */}
              <div className="card p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Memory Details</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Give your memory a title..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
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
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Tell your story..."
                        rows={5}
                        className={`w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none ${isPremiumUser ? 'pr-16' : ''}`}
                        required
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
                </div>
              </div>

              {/* Media Upload */}
              <div className="card p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Upload size={20} className="text-primary-600" />
                  <span>Add Media</span>
                </h2>
                
                <div className="space-y-4">
                                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colours">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*,audio/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="media-upload"
                    />
                    <label htmlFor="media-upload" className="cursor-pointer">
                      <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-600 text-sm mb-1">Drop files here or click to upload</p>
                      <p className="text-xs text-gray-500">Photos, videos, or audio files</p>
                    </label>
                  </div>
                  
                  {/* Enhanced Media Preview */}
                  {mediaFiles.length > 0 && (
                    <div className="space-y-4">
                      {mediaFiles.map((file, index) => {
                        const fileKey = getFileKey(file)
                        const isImage = file.type.startsWith('image/')
                        const isVideo = file.type.startsWith('video/')
                        const isAudio = file.type.startsWith('audio/')
                        const previewUrl = filePreviewUrls[fileKey]
                        const positioning = filePositioning[fileKey]
                        const isEditing = editingImageIndex === index

                        return (
                          <div key={index} className="border border-slate-200 rounded-lg overflow-hidden">
                            {isImage && previewUrl && positioning ? (
                              // Enhanced Image Preview with Controls
                              <div className="space-y-4 p-4">
                                {/* Image Preview */}
                                <div className="relative">
                                  <div className="relative w-80 h-60 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden mx-auto">
                                    <img
                                      src={previewUrl}
                                      alt={file.name}
                                      className="absolute cursor-move select-none"
                                      style={{
                                        width: `${100 * positioning.zoom}%`,
                                        height: `${100 * positioning.zoom}%`,
                                        transform: `translate(${positioning.position.x}px, ${positioning.position.y}px)`,
                                        minWidth: '100%',
                                        minHeight: '100%',
                                        objectFit: 'cover'
                                      }}
                                      onMouseDown={(e) => handleImageMouseDown(fileKey, e)}
                                      draggable={false}
                                    />
                                    {/* Invisible overlay to capture mouse events */}
                                    <div
                                      className="absolute inset-0 cursor-move"
                                      onMouseDown={(e) => handleImageMouseDown(fileKey, e)}
                                      onMouseMove={(e) => handleImageMouseMove(fileKey, e)}
                                      onMouseUp={() => handleImageMouseUp(fileKey)}
                                      onMouseLeave={() => handleImageMouseUp(fileKey)}
                                      style={{ zIndex: 1 }}
                                    />
                                    {/* Preview Label */}
                                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                      Preview
                                    </div>
                                  </div>
                                  
                                  {/* Remove Button */}
                                  <button
                                    onClick={() => removeFile(index)}
                                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors z-10"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>

                                {/* Image Controls */}
                                <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-700">Image Position & Zoom</span>
                                    <button
                                      onClick={() => resetImagePositioning(fileKey)}
                                      className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
                                    >
                                      Reset
                                    </button>
                                  </div>
                                  
                                  {/* Zoom Controls */}
                                  <div className="flex items-center space-x-3">
                                    <span className="text-xs text-slate-600 w-12">Zoom:</span>
                                    <button
                                      onClick={() => handleImageZoomChange(fileKey, positioning.zoom * 0.8)}
                                      className="w-8 h-8 bg-white border border-slate-200 rounded hover:bg-slate-50 flex items-center justify-center text-slate-600"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="range"
                                      min="0.05"
                                      max="5"
                                      step="0.05"
                                      value={positioning.zoom}
                                      onChange={(e) => handleImageZoomChange(fileKey, parseFloat(e.target.value))}
                                      className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <button
                                      onClick={() => handleImageZoomChange(fileKey, positioning.zoom * 1.25)}
                                      className="w-8 h-8 bg-white border border-slate-200 rounded hover:bg-slate-50 flex items-center justify-center text-slate-600"
                                    >
                                      +
                                    </button>
                                    <span className="text-xs text-slate-600 w-12">{Math.round(positioning.zoom * 100)}%</span>
                                  </div>
                                  
                                  {/* Instructions & File Info */}
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs text-slate-500 italic">
                                      💡 Drag to reposition, zoom to crop. Full image shown first!
                                    </p>
                                    <span className="text-xs text-slate-600 font-medium">{file.name}</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              // Simple preview for videos/audio or loading images
                              <div className="relative bg-gray-100 rounded-lg p-4">
                                <div className="flex items-center space-x-3">
                                  {isImage && <ImageIcon size={20} className="text-blue-500" />}
                                  {isVideo && <Film size={20} className="text-green-500" />}
                                  {isAudio && <Mic size={20} className="text-purple-500" />}
                                  <div className="flex-1">
                                    <span className="text-sm text-gray-700 font-medium">{file.name}</span>
                                    <p className="text-xs text-gray-500">
                                      {isImage && "Image loading..."}
                                      {isVideo && "Video file"}
                                      {isAudio && "Audio file"}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeFile(index)}
                                  className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - When Did This Happen */}
            <div className="card p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Calendar size={20} className="text-primary-600" />
                <span>When did this happen?</span>
                {selectedTimeZone && (
                  <span className="text-xs text-gray-500 font-normal">
                    (during {timeZones.find(tz => tz.id === selectedTimeZone)?.title})
                  </span>
                )}
              </h2>
              
              <div className="space-y-4">
                
                {/* Date Precision Options */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setDatePrecision('exact')}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      datePrecision === 'exact'
                        ? 'border-primary-600 bg-primary-50 text-primary-900'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">📅 I know the exact date</div>
                    <div className="text-xs text-gray-600">Specific date and time</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setDatePrecision('approximate')}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      datePrecision === 'approximate'
                        ? 'border-primary-600 bg-primary-50 text-primary-900'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">🤔 I remember roughly when</div>
                    <div className="text-xs text-gray-600">Season, year, or general timeframe</div>
                  </button>
                  
                  {selectedTimeZone && (
                    <button
                      type="button"
                      onClick={() => setDatePrecision('era')}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        datePrecision === 'era'
                          ? 'border-primary-600 bg-primary-50 text-primary-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-sm">🕰️ Sometime during {timeZones.find(tz => tz.id === selectedTimeZone)?.title}</div>
                      <div className="text-xs text-gray-600">
                        {timeZones.find(tz => tz.id === selectedTimeZone)?.startDate && timeZones.find(tz => tz.id === selectedTimeZone)?.endDate
                          ? `During ${new Date(timeZones.find(tz => tz.id === selectedTimeZone)!.startDate!).getFullYear()}-${new Date(timeZones.find(tz => tz.id === selectedTimeZone)!.endDate!).getFullYear()}`
                          : 'During this period'
                        }
                      </div>
                    </button>
                  )}
                </div>

                {/* Date Input Fields */}
                {datePrecision === 'exact' && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                      <div className="bg-white border border-gray-300 rounded-lg shadow-sm">
                        <DatePicker
                          selected={memoryDate}
                          onChange={(date) => setMemoryDate(date)}
                          dateFormat="MMMM d, yyyy"
                          showPopperArrow={false}
                          placeholderText="Select the date"
                          className="w-full px-4 py-3 text-gray-900 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          wrapperClassName="w-full"
                          calendarClassName="shadow-lg border border-gray-200 rounded-lg"
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
                          ]}
                          required
                        />
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        💡 Use the month and year dropdowns to quickly navigate to any date in your lifetime
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Time (optional)</label>
                      <input
                        type="time"
                        value={memoryTime}
                        onChange={(e) => setMemoryTime(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                {datePrecision === 'approximate' && (
                  <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Describe when this happened</label>
                      <input
                        type="text"
                        value={approximateDate}
                        onChange={(e) => setApproximateDate(e.target.value)}
                        placeholder={selectedTimeZone 
                          ? `e.g., Summer during ${timeZones.find(tz => tz.id === selectedTimeZone)?.title}, Early in the era, Christmas...`
                          : "e.g., Summer 1982, Early 80s, Christmas 1979..."
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      {/* Year Precision Toggle */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">How specific is the year?</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setApproximateDate(prev => prev.includes('-') ? approximateYear : prev)}
                            className={`p-2 rounded-lg border text-left transition-all ${
                              !approximateYear.includes('-')
                                ? 'border-primary-600 bg-primary-50 text-primary-900'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="font-medium text-xs">📅 Single year</div>
                            <div className="text-xs text-gray-600">e.g., 1982</div>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              if (!approximateYear.includes('-')) {
                                setApproximateYear(approximateYear ? `${approximateYear}-${parseInt(approximateYear) + 2}` : '1979-1984')
                              }
                            }}
                            className={`p-2 rounded-lg border text-left transition-all ${
                              approximateYear.includes('-')
                                ? 'border-primary-600 bg-primary-50 text-primary-900'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="font-medium text-xs">📊 Year range</div>
                            <div className="text-xs text-gray-600">e.g., 1979-1984</div>
                          </button>
                        </div>
                      </div>

                      {/* Year Input(s) Based on Choice */}
                      {!approximateYear.includes('-') ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                          <select
                            value={approximateYear}
                            onChange={(e) => setApproximateYear(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            <option value="">Select year...</option>
                            {Array.from({ length: 80 }, (_, i) => {
                              const year = new Date().getFullYear() - i
                              return (
                                <option key={year} value={year.toString()}>
                                  {year}
                                </option>
                              )
                            })}
                          </select>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Year</label>
                            <select
                              value={approximateYear.split('-')[0] || ''}
                              onChange={(e) => {
                                const endYear = approximateYear.split('-')[1] || ''
                                setApproximateYear(`${e.target.value}-${endYear}`)
                              }}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                              <option value="">Start year...</option>
                              {Array.from({ length: 80 }, (_, i) => {
                                const year = new Date().getFullYear() - i
                                return (
                                  <option key={year} value={year.toString()}>
                                    {year}
                                  </option>
                                )
                              })}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Year</label>
                            <select
                              value={approximateYear.split('-')[1] || ''}
                              onChange={(e) => {
                                const startYear = approximateYear.split('-')[0] || ''
                                setApproximateYear(`${startYear}-${e.target.value}`)
                              }}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                              <option value="">End year...</option>
                              {Array.from({ length: 80 }, (_, i) => {
                                const year = new Date().getFullYear() - i
                                return (
                                  <option key={year} value={year.toString()}>
                                    {year}
                                  </option>
                                )
                              })}
                            </select>
                          </div>
                        </div>
                      )}
                      
                      {selectedTimeZone && timeZones.find(tz => tz.id === selectedTimeZone)?.startDate && (
                        <div className="text-xs text-gray-500">
                          Era: {new Date(timeZones.find(tz => tz.id === selectedTimeZone)!.startDate!).getFullYear()}-{timeZones.find(tz => tz.id === selectedTimeZone)?.endDate ? new Date(timeZones.find(tz => tz.id === selectedTimeZone)!.endDate!).getFullYear() : 'ongoing'}
                        </div>
                      )}
                    </div>
                    <div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Season (optional)</label>
                        <select
                          value={approximateSeason}
                          onChange={(e) => setApproximateSeason(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="">Select season...</option>
                          <option value="Spring">🌸 Spring</option>
                          <option value="Summer">☀️ Summer</option>
                          <option value="Autumn">🍂 Autumn</option>
                          <option value="Winter">❄️ Winter</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {datePrecision === 'era' && selectedTimeZone && (
                  <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
                    <div className="text-primary-800">
                      <div className="font-medium mb-1 text-sm">Using era dating</div>
                      <div className="text-xs">
                        This memory will be dated to {timeZones.find(tz => tz.id === selectedTimeZone)?.title}
                        {timeZones.find(tz => tz.id === selectedTimeZone)?.startDate && (
                          <span> ({new Date(timeZones.find(tz => tz.id === selectedTimeZone)!.startDate!).getFullYear()})</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Group Organisation - After Memory Content */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <MapPin size={20} className="text-primary-600" />
              <span>Memory Organisation</span>
            </h2>
            
            <div className="space-y-4">
              
              {/* Keep Personal */}
              <button
                type="button"
                onClick={() => {
                  setSelectedTimeZone('')
                  setShowCreateGroup(false)
                }}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  selectedTimeZone === '' && !showCreateGroup
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">📝</span>
                  <div>
                    <div className={`font-medium ${selectedTimeZone === '' && !showCreateGroup ? 'text-primary-900' : 'text-gray-700'}`}>
                      Save as individual memory
                    </div>
                    <div className="text-sm text-gray-600">Don't add to any chapter or era</div>
                  </div>
                </div>
              </button>
              
              {/* Add to Existing Chapter - Only show if chapters exist */}
              {timeZones.length > 0 && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Add to existing chapter:</label>
                  <select
                    value={selectedTimeZone}
                    onChange={(e) => setSelectedTimeZone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={isLoadingTimeZones}
                  >
                    <option value="">Choose a chapter...</option>
                    {timeZones.map((tz) => (
                      <option key={tz.id} value={tz.id}>
                        {tz.type === 'GROUP' ? '📖' : '🔒'} {tz.title}
                        {tz.startDate && tz.endDate && ` (${new Date(tz.startDate).getFullYear()}-${new Date(tz.endDate).getFullYear()})`}
                    </option>
                  ))}
                </select>
              </div>
              )}
              
              {/* Create New Chapter */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  {timeZones.length === 0 ? 'Create your first chapter:' : 'Or create new chapter:'}
                </label>
                {timeZones.length === 0 ? (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <span className="text-blue-800">💡 You don't have any chapters yet.</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTimeZone('')
                          setShowCreateGroup(false)
                        }}
                        className="p-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colours text-sm text-center"
                      >
                        <div className="font-medium">Skip for now</div>
                        <div className="text-xs text-gray-600">Save as individual memory</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateGroup(true)}
                        className="p-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colours text-sm text-center"
                      >
                        <div className="font-medium">Create first chapter</div>
                        <div className="text-xs text-primary-100">Organise memories by era</div>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCreateGroup(!showCreateGroup)}
                    className="w-full px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colours flex items-center justify-center space-x-2"
                  >
                    <Plus size={18} />
                    <span>New Chapter</span>
                  </button>
                )}
              </div>
            </div>
            
            {/* Group Explanation */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-blue-800">
                <div className="font-medium text-sm mb-1">💡 Why create a group?</div>
                <div className="text-xs leading-relaxed">
                  Groups help you organise memories from the same period of your life (like "University Days" or "The Cocke Hotel"). 
                  The group represents the <strong>broader time period or era</strong> (e.g., 1979-1984), whilst individual memories are 
                  specific events within that era. Once you create a group, you can add more memories to it later - perfect for building 
                  up stories from shared experiences with friends and family.
                </div>
              </div>
            </div>
            
            {/* Quick Group Creation Form */}
            {showCreateGroup && (
              <div className="mt-6 p-4 bg-gray-50 rounded-xl border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Group/Era</h3>
                
                {/* Date Template Option */}
                {((datePrecision === 'approximate' && approximateYear) || (datePrecision === 'era' && selectedTimeZone)) && (
                  <div className="mb-6 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="text-amber-800">
                      <div className="font-medium text-sm mb-2">💡 Use memory dates as group template?</div>
                      <div className="text-xs mb-3 leading-relaxed">
                        Your memory is dated as {datePrecision === 'approximate' ? `around ${approximateYear}` : datePrecision === 'era' ? 'era-based' : 'approximately'}. 
                        Would you like to use this as a starting point for your group's date range? 
                        You can then expand it to cover the full period (e.g., if your memory is from 1982, you might want the group to span 1979-1984).
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (datePrecision === 'approximate' && approximateYear) {
                              setGroupDatePrecision('estimated')
                              setGroupStartYear(approximateYear)
                              setGroupEndYear(approximateYear)
                            } else if (datePrecision === 'era' && selectedTimeZone) {
                              // For era-based, we could get the time zone's date range
                              const selectedTz = timeZones.find(tz => tz.id === selectedTimeZone)
                              if (selectedTz && selectedTz.startDate && selectedTz.endDate) {
                                setGroupDatePrecision('estimated')
                                setGroupStartYear(new Date(selectedTz.startDate).getFullYear().toString())
                                setGroupEndYear(new Date(selectedTz.endDate).getFullYear().toString())
                              }
                            }
                          }}
                          className="px-3 py-1 bg-amber-600 text-white rounded text-xs hover:bg-amber-700 transition-colours"
                        >
                          Yes, use as template
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            // Just continue with empty form - no action needed
                          }}
                          className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 transition-colours"
                        >
                          No, start fresh
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Group Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Group Name *</label>
                  <input
                    type="text"
                    value={newGroupTitle}
                    onChange={(e) => setNewGroupTitle(e.target.value)}
                    placeholder="e.g., The Cocke Hotel, University Days, Family Holidays..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Date Precision Toggle */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">How specific are your dates?</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setGroupDatePrecision('estimated')}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        groupDatePrecision === 'estimated'
                          ? 'border-primary-600 bg-primary-50 text-primary-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-sm">📅 Estimated years</div>
                      <div className="text-xs text-gray-600">I know roughly when (e.g., 1979-1984)</div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setGroupDatePrecision('exact')}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        groupDatePrecision === 'exact'
                          ? 'border-primary-600 bg-primary-50 text-primary-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-sm">🎯 Exact dates</div>
                      <div className="text-xs text-gray-600">I know specific start/end dates</div>
                    </button>
                  </div>
                </div>

                {/* Date Inputs Based on Precision */}
                {groupDatePrecision === 'estimated' ? (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Year</label>
                      <select
                        value={groupStartYear}
                        onChange={(e) => setGroupStartYear(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Select year...</option>
                        {Array.from({ length: 70 }, (_, i) => {
                          const year = new Date().getFullYear() - i
                          return (
                            <option key={year} value={year.toString()}>
                              {year}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Year</label>
                      <select
                        value={groupEndYear}
                        onChange={(e) => setGroupEndYear(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Select year...</option>
                        <option value="ongoing">Ongoing</option>
                        {Array.from({ length: 70 }, (_, i) => {
                          const year = new Date().getFullYear() - i
                          return (
                            <option key={year} value={year.toString()}>
                              {year}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={newGroupStartDate}
                        onChange={(e) => setNewGroupStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={newGroupEndDate}
                        onChange={(e) => setNewGroupEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                {/* Location and Type */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <input
                      type="text"
                      value={newGroupLocation}
                      onChange={(e) => setNewGroupLocation(e.target.value)}
                      placeholder="e.g., London, Manchester, Home..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={newGroupType}
                      onChange={(e) => setNewGroupType(e.target.value as 'PERSONAL' | 'GROUP')}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="GROUP">👥 Shared Group</option>
                      <option value="PERSONAL">🔒 Personal Era</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                  <textarea
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder="Describe what this group/era represents..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Group Image */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Group Image (optional)</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary-400 transition-colours">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setNewGroupImage(e.target.files?.[0] || null)}
                      className="hidden"
                      id="group-image-upload"
                    />
                    <label htmlFor="group-image-upload" className="cursor-pointer">
                      {newGroupImage ? (
                        <div className="flex items-center justify-center space-x-2">
                          <span className="text-primary-600 text-sm">📷 {newGroupImage.name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              setNewGroupImage(null)
                            }}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="text-gray-400 mb-2">📷</div>
                          <p className="text-gray-600 text-sm">Click to add a group image</p>
                          <p className="text-xs text-gray-500">Will represent this era in your timeline</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Enhanced Preview */}
                {newGroupTitle && (groupStartYear || newGroupStartDate) && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Preview of your group:</h4>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      {/* Header with optional image */}
                      <div className="relative">
                        {newGroupImage ? (
                          <div className="relative bg-gradient-to-r from-primary-400 to-primary-600">
                            <img
                              src={URL.createObjectURL(newGroupImage)}
                              alt="Group preview"
                              className="w-full max-h-48 object-contain bg-gray-100"
                              style={{ minHeight: '120px' }}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-10"></div>
                          </div>
                        ) : (
                          <div className="h-24 bg-gradient-to-r from-primary-400 to-primary-600"></div>
                        )}
                        
                        {/* Group type badge */}
                        <div className="absolute top-3 right-3">
                          <span className="px-2 py-1 bg-white bg-opacity-90 rounded-full text-xs font-medium text-gray-700">
                            {newGroupType === 'GROUP' ? '👥 Shared' : '🔒 Personal'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {newGroupTitle}
                            </h3>
                            
                            {/* Date range */}
                            <div className="flex items-center text-sm text-gray-600 mb-2">
                              <Calendar size={14} className="mr-1" />
                              {groupDatePrecision === 'estimated' && groupStartYear && (
                                <span>{groupStartYear}{groupEndYear && groupEndYear !== 'ongoing' ? `-${groupEndYear}` : groupEndYear === 'ongoing' ? '-ongoing' : ''}</span>
                              )}
                              {groupDatePrecision === 'exact' && newGroupStartDate && (
                                <span>{new Date(newGroupStartDate).getFullYear()}{newGroupEndDate ? `-${new Date(newGroupEndDate).getFullYear()}` : ''}</span>
                              )}
                            </div>
                            
                            {/* Location */}
                            {newGroupLocation && (
                              <div className="flex items-center text-sm text-gray-600 mb-3">
                                <MapPin size={14} className="mr-1" />
                                <span>{newGroupLocation}</span>
                              </div>
                            )}
                            
                            {/* Description */}
                            {newGroupDescription && (
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {newGroupDescription}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Stats preview */}
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                          <div className="flex space-x-4">
                            <div className="text-xs text-gray-500">
                              <span className="font-medium">0</span> memories
                            </div>
                            <div className="text-xs text-gray-500">
                              <span className="font-medium">1</span> member
                            </div>
                          </div>
                          <div className="text-xs text-primary-600 font-medium">
                            ✨ New Group
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleCreateGroup}
                    disabled={!newGroupTitle.trim() || isCreatingGroup || (!groupStartYear && !newGroupStartDate)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isCreatingGroup ? 'Creating...' : 'Create Group'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateGroup(false)
                      setGroupDatePrecision('estimated')
                      setGroupStartYear('')
                      setGroupEndYear('')
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {/* Selected Group Confirmation */}
            {selectedTimeZone && (
              <div className="mt-4 p-3 bg-primary-50 rounded-lg border border-primary-200">
                <div className="flex items-center space-x-2 text-primary-700">
                  <span className="text-lg">✓</span>
                  <span className="font-medium text-sm">
                    Will be added to: {timeZones.find(tz => tz.id === selectedTimeZone)?.title}
                    {timeZones.find(tz => tz.id === selectedTimeZone)?.location && (
                      <span className="text-primary-600"> • {timeZones.find(tz => tz.id === selectedTimeZone)?.location}</span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-6 pb-12">
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !content.trim()}
              className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
            >
              {isSubmitting ? 'Creating Memory...' : 'Create Memory'}
            </button>
          </div>
        </form>
      </div>
      
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