'use client'

import { useState, useEffect } from 'react'
import { X, Save, Loader2, Upload, Crop, Trash2, ChevronDown } from 'lucide-react'
import { MemoryWithRelations, TimeZoneWithRelations } from '@/lib/types'
import toast from 'react-hot-toast'
import ImageCropper from '@/components/ImageCropper'
import DeleteConfirmationModal from './DeleteConfirmationModal'
import { useAuth } from '@/components/AuthProvider'

interface EditMemoryModalProps {
  memory: MemoryWithRelations | null
  isOpen: boolean
  onClose: () => void
  onSave: (updatedMemory: MemoryWithRelations) => void
  onDelete?: (memory: MemoryWithRelations) => void
}

export default function EditMemoryModal({ memory, isOpen, onClose, onSave, onDelete }: EditMemoryModalProps) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [textContent, setTextContent] = useState('')
  const [selectedChapterId, setSelectedChapterId] = useState<string>('')
  const [chapters, setChapters] = useState<TimeZoneWithRelations[]>([])
  const [isLoadingChapters, setIsLoadingChapters] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [existingMediaToDelete, setExistingMediaToDelete] = useState<string[]>([])
  const [showImageCropper, setShowImageCropper] = useState(false)
  const [tempImageForCrop, setTempImageForCrop] = useState<{ file: File, index: number, isExisting?: boolean, mediaId?: string, aspectRatio?: number } | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeletingMemory, setIsDeletingMemory] = useState(false)

  useEffect(() => {
    if (memory) {
      setTitle(memory.title || '')
      setTextContent(memory.textContent || '')
      setSelectedChapterId(memory.timeZoneId || '')
      setMediaFiles([])
      setExistingMediaToDelete([])
    }
  }, [memory])

  // Fetch chapters when modal opens
  useEffect(() => {
    if (isOpen && user) {
      fetchChapters()
    }
  }, [isOpen, user])

  const fetchChapters = async () => {
    if (!user) return
    
    setIsLoadingChapters(true)
    try {
      console.log('🔑 EDIT MEMORY MODAL: Getting auth token for user:', user.id)

      // Get custom JWT token for API
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      if (!tokenResponse.ok) {
        console.error('❌ EDIT MEMORY MODAL: Failed to get auth token:', tokenResponse.status)
        return
      }

      const { token } = await tokenResponse.json()
      console.log('✅ EDIT MEMORY MODAL: Got auth token')

      console.log('📡 EDIT MEMORY MODAL: Calling /api/timezones (chapters)')
      const response = await fetch('/api/timezones', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('📡 EDIT MEMORY MODAL: Response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('✅ EDIT MEMORY MODAL: Chapters fetched:', data.timeZones?.length || 0)
        setChapters(data.timeZones || [])
      } else {
        console.error('❌ EDIT MEMORY MODAL: Failed to fetch chapters:', response.status)
      }
    } catch (error) {
      console.error('❌ EDIT MEMORY MODAL: Error fetching chapters:', error)
    } finally {
      setIsLoadingChapters(false)
    }
  }

  const handleSave = async () => {
    if (!memory) return

    console.log('🔄 EDIT MEMORY: Starting save process...', {
      memoryId: memory.id,
      title: title.trim(),
      textContentLength: textContent.trim().length,
      newMediaFiles: mediaFiles.length,
      mediaToDelete: existingMediaToDelete.length
    })

    setIsLoading(true)
    try {
      if (!user) {
        console.error('❌ EDIT MEMORY: No user found')
        toast.error('Please log in again')
        setIsLoading(false)
        return
      }

      // Get custom JWT token for API
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      if (!tokenResponse.ok) {
        console.error('❌ EDIT MEMORY: Failed to get auth token:', tokenResponse.status)
        toast.error('Authentication failed - please try again')
        setIsLoading(false)
        return
      }

      const { token } = await tokenResponse.json()
      console.log('✅ EDIT MEMORY: Got auth token')

      const formData = new FormData()
      formData.append('title', title.trim() || '')
      formData.append('textContent', textContent.trim() || '')
      formData.append('timeZoneId', selectedChapterId || '')
      
      // Add new media files
      console.log('📁 EDIT MEMORY: Adding media files...', mediaFiles.map(f => ({ name: f.name, size: f.size, type: f.type })))
      mediaFiles.forEach((file, index) => {
        console.log(`📁 Adding file ${index + 1}:`, file.name, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`)
        formData.append('media', file)
      })
      
      // Add media to delete
      if (existingMediaToDelete.length > 0) {
        console.log('🗑️ EDIT MEMORY: Marking media for deletion:', existingMediaToDelete)
      }
      existingMediaToDelete.forEach((mediaId) => {
        formData.append('deleteMedia', mediaId)
      })

      console.log('🌐 EDIT MEMORY: Making API call...')
      
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const response = await fetch(`/api/memories/${memory.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      console.log('📡 EDIT MEMORY: Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      if (!response.ok) {
        console.error('❌ EDIT MEMORY: HTTP error:', response.status, response.statusText)
        toast.error(`Server error: ${response.status} ${response.statusText}`)
        return
      }

      console.log('📦 EDIT MEMORY: Parsing response JSON...')
      const data = await response.json()
      console.log('✅ EDIT MEMORY: Response data:', data)

      if (data.success) {
        console.log('🎉 EDIT MEMORY: Memory updated successfully!')
        toast.success('Memory updated successfully!')
        onSave(data.memory)
        onClose()
      } else {
        console.error('❌ EDIT MEMORY: Server returned error:', data.error)
        toast.error(data.error || 'Failed to update memory')
      }
    } catch (error) {
      console.error('💥 EDIT MEMORY: Unexpected error:', error)
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast.error('Request timed out - please try again with smaller images')
      } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        toast.error('Network error - please check your connection')
      } else {
        toast.error('Failed to update memory - please try again')
      }
    } finally {
      console.log('🔄 EDIT MEMORY: Save process completed')
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    // Allow closing even if loading - just reset the loading state
    if (isLoading) {
      console.log('🔄 EDIT MEMORY: Force closing modal and resetting loading state')
      setIsLoading(false)
    }
    onClose()
  }

  const handleDeleteMemory = () => {
    if (!memory) return
    setShowDeleteModal(true)
  }

  const confirmDeleteMemory = async () => {
    if (!memory || !onDelete || !user) return
    
    setIsDeletingMemory(true)
    try {
      console.log('🗑️ EDIT MEMORY MODAL: Deleting memory:', memory.id)
      
      // Get custom JWT token for API
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      if (!tokenResponse.ok) {
        console.error('❌ EDIT MEMORY MODAL: Failed to get auth token for delete:', tokenResponse.status)
        toast.error('Authentication failed - please try again')
        return
      }

      const { token } = await tokenResponse.json()
      console.log('✅ EDIT MEMORY MODAL: Got auth token for delete')

      const response = await fetch(`/api/memories/${memory.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('📡 EDIT MEMORY MODAL: Delete response status:', response.status)

      const data = await response.json()
      console.log('📡 EDIT MEMORY MODAL: Delete response data:', data)

      if (data.success) {
        console.log('🎉 EDIT MEMORY MODAL: Memory deleted successfully!')
        toast.success('Memory deleted successfully!')
        onDelete(memory)
        setShowDeleteModal(false)
        onClose()
      } else if (response.status === 404) {
        console.log('🔄 EDIT MEMORY MODAL: Memory already deleted - cleaning up frontend state')
        toast.success('Memory already deleted')
        // Memory doesn't exist in DB anymore, notify parent to remove from state
        onDelete(memory)
        setShowDeleteModal(false)
        onClose()
      } else {
        console.error('❌ EDIT MEMORY MODAL: Server returned error:', data.error)
        toast.error(data.error || 'Failed to delete memory')
      }
    } catch (error) {
      console.error('💥 EDIT MEMORY MODAL: Delete memory error:', error)
      toast.error('Failed to delete memory')
    } finally {
      setIsDeletingMemory(false)
    }
  }

  const cancelDeleteMemory = () => {
    setShowDeleteModal(false)
  }

  // Helper function to get image aspect ratio
  const getImageAspectRatio = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const aspectRatio = img.naturalWidth / img.naturalHeight
        resolve(aspectRatio)
      }
      img.onerror = () => {
        // Fallback to square aspect ratio if image can't be loaded
        resolve(1)
      }
      img.src = URL.createObjectURL(file)
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📁 EDIT MEMORY: File upload triggered')
    
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      console.log('📁 EDIT MEMORY: Files selected:', newFiles.map(f => ({ 
        name: f.name, 
        size: `${(f.size / 1024 / 1024).toFixed(2)}MB`, 
        type: f.type 
      })))
      
      // For single image, show cropper immediately
      if (newFiles.length === 1 && newFiles[0].type.startsWith('image/')) {
        const file = newFiles[0]
        console.log('📁 EDIT MEMORY: Single image upload - showing cropper')
        
        if (file.size > 10 * 1024 * 1024) {
          console.error('❌ EDIT MEMORY: File too large:', file.size)
          toast.error('Image must be smaller than 10MB')
          return
        }
        
        // Get the image's natural aspect ratio
        const aspectRatio = await getImageAspectRatio(file)
        console.log('📁 EDIT MEMORY: Image aspect ratio:', aspectRatio)
        
        // Show cropper immediately for new upload
        setTempImageForCrop({ file, index: mediaFiles.length, aspectRatio })
        setShowImageCropper(true)
        setMediaFiles(prev => {
          console.log('📁 EDIT MEMORY: Adding file to media files')
          return [...prev, file]
        })
      } else {
        console.log('📁 EDIT MEMORY: Multiple files upload')
        // Multiple files - add them and let user crop individually
        const validFiles = newFiles.filter(file => {
          if (file.size > 10 * 1024 * 1024) {
            console.error('❌ EDIT MEMORY: File too large:', file.name, file.size)
            toast.error(`${file.name} is too large (max 10MB)`)
            return false
          }
          return true
        })
        console.log('📁 EDIT MEMORY: Valid files:', validFiles.length)
        setMediaFiles(prev => [...prev, ...validFiles])
      }
    } else {
      console.log('❌ EDIT MEMORY: No files selected')
    }
    
    // Reset the input
    e.target.value = ''
  }

  const removeNewFile = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
  }

  const toggleDeleteExistingMedia = (mediaId: string) => {
    setExistingMediaToDelete(prev => 
      prev.includes(mediaId) 
        ? prev.filter(id => id !== mediaId)
        : [...prev, mediaId]
    )
  }

  const handleCropComplete = (croppedFile: File | null) => {
    if (croppedFile && tempImageForCrop) {
      if (tempImageForCrop.isExisting && tempImageForCrop.mediaId) {
        // Replace existing media by deleting it and adding new cropped version
        setExistingMediaToDelete(prev => [...prev, tempImageForCrop.mediaId!])
        setMediaFiles(prev => [...prev, croppedFile])
      } else {
        // Replace new media file
        setMediaFiles(prev => 
          prev.map((f, i) => i === tempImageForCrop.index ? croppedFile : f)
        )
      }
    }
    setShowImageCropper(false)
    setTempImageForCrop(null)
  }

  const cropExistingImage = async (mediaId: string, imageUrl: string) => {
    try {
      // Fetch the existing image and convert to File
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const file = new File([blob], 'existing-image.jpg', { type: blob.type })
      
      // Get the image's natural aspect ratio
      const aspectRatio = await getImageAspectRatio(file)
      console.log('📁 EDIT MEMORY: Existing image aspect ratio:', aspectRatio)
      
      setTempImageForCrop({ 
        file, 
        index: 0, 
        isExisting: true, 
        mediaId,
        aspectRatio
      })
      setShowImageCropper(true)
    } catch (error) {
      console.error('Error loading existing image:', error)
      toast.error('Failed to load image for cropping')
    }
  }

  if (!isOpen || !memory) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Edit Memory</h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Memory Images Section */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-3">Memory Images</label>
            
            {/* Primary Image Area */}
            <div className="mb-4">
              {/* Show existing primary image if not marked for deletion */}
              {memory.media && memory.media.length > 0 && memory.media[0] && !existingMediaToDelete.includes(memory.media[0].id) ? (
                <div className="relative">
                  <div className="relative w-full h-64 rounded-lg overflow-hidden border-2 border-slate-200">
                    <img
                      src={memory.media[0].storage_url || memory.media[0].thumbnail_url || ''}
                      alt="Primary memory"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      Primary Image
                    </div>
                  </div>
                  
                  {/* Remove Image Button */}
                  <button
                    onClick={() => toggleDeleteExistingMedia(memory.media![0].id)}
                    className="absolute top-2 right-2 rounded-full p-1.5 bg-red-500 hover:bg-red-600 text-white transition-colors"
                    title="Remove this image"
                  >
                    <X size={16} />
                  </button>
                  
                  {/* Actions */}
                  <div className="flex items-center justify-center space-x-3 mt-3">
                    <button
                      onClick={() => cropExistingImage(memory.media![0].id, memory.media![0].storage_url || '')}
                      className="inline-flex items-center space-x-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg transition-colors"
                      type="button"
                    >
                      <Crop size={16} />
                      <span>Adjust Position</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Show upload placeholder when no primary image or primary image is deleted */
                <div className="relative w-full h-64 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center">
                  <Upload size={48} className="text-slate-400 mb-4" />
                  <p className="text-slate-600 font-medium mb-2">Add Primary Image</p>
                  <p className="text-slate-500 text-sm text-center mb-4">
                    Upload an image to be the main photo for this memory
                  </p>
                  <label className="inline-flex items-center space-x-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg cursor-pointer transition-colors font-medium">
                    <Upload size={16} />
                    <span>Choose Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isLoading}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Additional images - only show those not marked for deletion */}
            {memory.media && memory.media.length > 1 && (
              <div>
                {/* Filter out deleted images */}
                {(() => {
                  const visibleAdditionalImages = memory.media.slice(1).filter(media => 
                    !existingMediaToDelete.includes(media.id)
                  )
                  
                  if (visibleAdditionalImages.length > 0) {
                    return (
                      <>
                        <h4 className="text-sm font-medium text-slate-700 mb-2">Additional Images</h4>
                        <div className="grid grid-cols-3 gap-3">
                          {visibleAdditionalImages.map((media) => (
                            <div key={media.id} className="relative group">
                              <div className="aspect-square rounded-lg overflow-hidden border border-slate-200">
                                <img
                                  src={media.thumbnail_url || media.storage_url}
                                  alt="Additional memory"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              
                              {/* Action buttons */}
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-1">
                                <button
                                  onClick={() => cropExistingImage(media.id, media.storage_url)}
                                  className="p-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg transition-colors"
                                  title="Adjust Position"
                                  type="button"
                                >
                                  <Crop size={12} />
                                </button>
                                <button
                                  onClick={() => toggleDeleteExistingMedia(media.id)}
                                  className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                                  title="Delete image"
                                  type="button"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )
                  }
                  return null
                })()}
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your memory a title..."
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-colors"
              disabled={isLoading}
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Description
            </label>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Describe your memory..."
              rows={4}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-colors resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Chapter Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Chapter (optional)
            </label>
            {isLoadingChapters ? (
              <div className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-slate-50 flex items-center justify-center">
                <Loader2 size={16} className="animate-spin text-slate-500 mr-2" />
                <span className="text-slate-500 text-sm">Loading chapters...</span>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedChapterId}
                  onChange={(e) => setSelectedChapterId(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none transition-colors appearance-none bg-white pr-10"
                  disabled={isLoading}
                >
                  <option value="">No chapter (unorganized)</option>
                  {chapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.title}
                    </option>
                  ))}
                </select>
                <ChevronDown size={20} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
            <p className="text-xs text-slate-500 mt-1">
              {selectedChapterId 
                ? `Memory will be organized under "${chapters.find(c => c.id === selectedChapterId)?.title || 'Selected Chapter'}"` 
                : 'Memory will remain unorganized'
              }
            </p>
          </div>

          {/* Additional Images Section - Only show if there's a primary image or new files */}
          {((memory.media && memory.media.length > 0 && memory.media[0] && !existingMediaToDelete.includes(memory.media[0].id)) || mediaFiles.length > 0) && (
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-3">Additional Images</label>
              
              {/* New Media Preview */}
              {mediaFiles.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">New images to add</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {mediaFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden border border-slate-200">
                          {file.type.startsWith('image/') ? (
                            <img
                              src={URL.createObjectURL(file)}
                              alt="New image"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-200">
                              <span className="text-lg">
                                {file.type.startsWith('video/') ? '🎥' : '🎵'}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Action buttons */}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-1">
                          {file.type.startsWith('image/') && (
                            <button
                              onClick={async () => {
                                const aspectRatio = await getImageAspectRatio(file)
                                setTempImageForCrop({ file, index, aspectRatio })
                                setShowImageCropper(true)
                              }}
                              className="p-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg transition-colors"
                              title="Adjust Position"
                              type="button"
                            >
                              <Crop size={12} />
                            </button>
                          )}
                          <button
                            onClick={() => removeNewFile(index)}
                            className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                            title="Remove image"
                            type="button"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Upload Button */}
              <div className="text-center">
                <label className="inline-flex items-center space-x-2 bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg cursor-pointer transition-colors font-medium">
                  <Upload size={16} />
                  <span>Add More Images</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isLoading}
                  />
                </label>
              </div>
              
              <p className="text-xs text-slate-500 mt-3 text-center">
                Add additional images to complement your main memory photo
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex-shrink-0 border-t border-slate-200 ${isLoading ? 'bg-yellow-50' : 'bg-slate-50'}`}>
          {isLoading && (
            <div className="px-6 py-2 bg-yellow-100 border-b border-yellow-200">
              <p className="text-xs text-yellow-800 text-center">
                💾 Saving... If this takes too long, click "Force Close" to exit safely
              </p>
            </div>
          )}
          
          <div className="flex items-center justify-between p-6">
          {/* Delete Button - Left Side */}
          <div>
            {onDelete && (
              <button
                onClick={handleDeleteMemory}
                disabled={isLoading}
                className="px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                title="Delete this memory permanently"
              >
                <Trash2 size={16} />
                <span>Delete Memory</span>
              </button>
            )}
          </div>

          {/* Cancel & Save Buttons - Right Side */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleClose}
              className={`px-4 py-2 transition-colors ${
                isLoading 
                  ? 'text-red-600 hover:text-red-800 font-medium' 
                  : 'text-slate-600 hover:text-slate-800'
              }`}
              title={isLoading ? 'Force close (stops loading)' : 'Cancel'}
            >
              {isLoading ? 'Force Close' : 'Cancel'}
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
        </div>
      </div>
      
      {/* Image Cropper Modal */}
      {showImageCropper && tempImageForCrop && (
        <ImageCropper
          imageUrl={URL.createObjectURL(tempImageForCrop.file)}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowImageCropper(false)
            setTempImageForCrop(null)
          }}
          title={tempImageForCrop.isExisting ? "Crop existing photo" : "Crop new photo"}
          aspectRatio={tempImageForCrop.aspectRatio || 1}
          outputWidth={tempImageForCrop.aspectRatio && tempImageForCrop.aspectRatio > 1 ? 1920 : 1080}
          outputHeight={tempImageForCrop.aspectRatio && tempImageForCrop.aspectRatio > 1 ? Math.round(1920 / tempImageForCrop.aspectRatio) : Math.round(1080 * (tempImageForCrop.aspectRatio || 1))}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        title="Delete Memory"
        message="Are you sure you want to delete this memory?"
        itemName={memory?.title || 'Untitled Memory'}
        itemType="memory"
        onConfirm={confirmDeleteMemory}
        onCancel={cancelDeleteMemory}
        isLoading={isDeletingMemory}
      />
    </div>
  )
}