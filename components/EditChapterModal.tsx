import React, { useState, useEffect, useRef } from 'react'
import { X, Image as ImageIcon } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@supabase/supabase-js'
import toast from 'react-hot-toast'
import { TimeZoneWithRelations } from '@/lib/types'

interface EditChapterModalProps {
  chapter: TimeZoneWithRelations | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface EditingChapter {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
  location: string
  headerImageUrl: string | null
}

export default function EditChapterModal({ chapter, isOpen, onClose, onSuccess }: EditChapterModalProps) {
  const { user } = useAuth()
  const [editingChapter, setEditingChapter] = useState<EditingChapter | null>(null)
  const [selectedHeaderImage, setSelectedHeaderImage] = useState<File | null>(null)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Image positioning state
  const [imageZoom, setImageZoom] = useState(1)
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hasUserInteracted, setHasUserInteracted] = useState(false)

  // Autosave and unsaved changes state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
  const [originalChapter, setOriginalChapter] = useState<EditingChapter | null>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Format date for input field
  const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return ''
    
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return ''
      
      return date.toISOString().split('T')[0]
    } catch {
      return ''
    }
  }

  // Check if current data differs from original
  const checkForChanges = (current: EditingChapter | null, original: EditingChapter | null): boolean => {
    if (!current || !original) return false
    
    return (
      current.title !== original.title ||
      current.description !== original.description ||
      current.startDate !== original.startDate ||
      current.endDate !== original.endDate ||
      current.location !== original.location ||
      current.headerImageUrl !== original.headerImageUrl ||
      selectedHeaderImage !== null
    )
  }

  // Debounced autosave function
  const scheduleAutoSave = () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }
    
    autoSaveTimeoutRef.current = setTimeout(async () => {
      if (editingChapter && hasUnsavedChanges && !isUpdating) {
        await performAutoSave()
      }
    }, 2000) // Auto-save after 2 seconds of inactivity
  }

  // Perform the actual autosave
  const performAutoSave = async () => {
    if (!editingChapter || isUpdating) return

    setIsAutoSaving(true)
    try {
      const formData = new FormData()
      formData.append('title', editingChapter.title)
      formData.append('description', editingChapter.description)
      formData.append('startDate', editingChapter.startDate)
      formData.append('endDate', editingChapter.endDate)
      formData.append('location', editingChapter.location)
      
      if (selectedHeaderImage) {
        if (hasUserInteracted) {
          const croppedImage = await createCroppedImage()
          if (croppedImage) {
            formData.append('headerImage', croppedImage)
          } else {
            formData.append('headerImage', selectedHeaderImage)
          }
        } else {
          formData.append('headerImage', selectedHeaderImage)
        }
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
        setLastSaved(new Date())
        setHasUnsavedChanges(false)
        setOriginalChapter({ ...editingChapter })
        setSelectedHeaderImage(null) // Reset after successful save
        toast.success('Auto-saved successfully', { duration: 2000 })
      }
    } catch (error) {
      console.error('Autosave error:', error)
    } finally {
      setIsAutoSaving(false)
    }
  }

  // Handle close with unsaved changes check
  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true)
    } else {
      onClose()
    }
  }

  // Force close without saving
  const forceClose = () => {
    setShowUnsavedWarning(false)
    setHasUnsavedChanges(false)
    onClose()
  }

  // Save and then close
  const saveAndClose = async () => {
    await handleUpdateChapter()
    setShowUnsavedWarning(false)
  }

  // Set up editing state when chapter changes
  useEffect(() => {
    if (chapter && isOpen) {
      const initialChapter = {
        id: chapter.id,
        title: chapter.title,
        description: chapter.description || '',
        startDate: formatDateForInput(chapter.startDate),
        endDate: formatDateForInput(chapter.endDate),
        location: chapter.location || '',
        headerImageUrl: chapter.headerImageUrl || null
      }
      
      setEditingChapter(initialChapter)
      setOriginalChapter({ ...initialChapter })
      setSelectedHeaderImage(null)
      setPreviewImageUrl(null)
      setHasUnsavedChanges(false)
      setLastSaved(null)
      setShowUnsavedWarning(false)
      
      // Reset image positioning
      setImageZoom(1)
      setImagePosition({ x: 0, y: 0 })
      setHasUserInteracted(false)
    }
  }, [chapter, isOpen])

  // Watch for changes and schedule autosave
  useEffect(() => {
    if (editingChapter && originalChapter) {
      const hasChanges = checkForChanges(editingChapter, originalChapter) || selectedHeaderImage !== null
      setHasUnsavedChanges(hasChanges)
      
      if (hasChanges) {
        scheduleAutoSave()
      }
    }
  }, [editingChapter, selectedHeaderImage, originalChapter])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  // Get auth token
  const getAuthToken = async () => {
    if (!user) return null
    
    try {
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      if (!tokenResponse.ok) return null
      
      const { token } = await tokenResponse.json()
      return token
    } catch (error) {
      console.error('Failed to get auth token:', error)
      return null
    }
  }

  // Handle image selection
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedHeaderImage(file)
      
      // Create preview URL
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl)
      }
      const newPreviewUrl = URL.createObjectURL(file)
      setPreviewImageUrl(newPreviewUrl)
      
      // Calculate initial zoom to show FULL image (fit to container)
      const img = new Image()
      img.onload = () => {
        const previewWidth = 320 // w-80
        const previewHeight = 240 // h-60
        const imgAspect = img.naturalWidth / img.naturalHeight
        const previewAspect = previewWidth / previewHeight
        
        // Start at 100% zoom to show image at natural size
        let initialZoom = 1.0
        
        setImageZoom(initialZoom)
        setImagePosition({ x: 0, y: 0 }) // Start centered
        setHasUserInteracted(false) // Reset interaction tracking
      }
      img.src = newPreviewUrl
    }
  }

  // Image positioning handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    
    const newX = e.clientX - dragStart.x
    const newY = e.clientY - dragStart.y
    
    // Boundary checking with CSS scale transform
    // Allow more movement when zoomed in, less when zoomed out
    const maxOffset = imageZoom > 1 ? 200 * (imageZoom - 1) : 50
    const minX = -maxOffset
    const maxX = maxOffset
    const minY = -maxOffset
    const maxY = maxOffset
    
    setImagePosition({
      x: Math.max(minX, Math.min(maxX, newX)),
      y: Math.max(minY, Math.min(maxY, newY))
    })
    setHasUserInteracted(true) // User is dragging the image
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleZoomChange = (newZoom: number) => {
    // More reasonable zoom range
    const minZoom = 0.2  // Minimum zoom to keep image visible
    const maxZoom = 3    // Maximum zoom for detail viewing
    const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom))
    
    // Calculate how much the image size is changing
    const zoomRatio = clampedZoom / imageZoom
    
    setImageZoom(clampedZoom)
    setHasUserInteracted(true) // User is adjusting zoom
    
    // Keep image centered when zooming
    const previewWidth = 320 // w-80
    const previewHeight = 240 // h-60
    
    // Keep position within reasonable bounds when zooming
    // With CSS scale, we need to calculate bounds differently
    setImagePosition(prev => {
      // For zoom > 1, allow more movement; for zoom < 1, restrict movement
      const maxOffset = clampedZoom > 1 ? 200 * (clampedZoom - 1) : 50
      
      return {
        x: Math.max(-maxOffset, Math.min(maxOffset, prev.x)),
        y: Math.max(-maxOffset, Math.min(maxOffset, prev.y))
      }
    })
  }

  // Create cropped image based on current position and zoom
  const createCroppedImage = (): Promise<File | null> => {
    return new Promise((resolve) => {
      if (!previewImageUrl) {
        console.log('🖼️ CROP: No preview image URL')
        resolve(null)
        return
      }

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        console.error('❌ CROP: Could not get canvas context')
        resolve(null)
        return
      }

      console.log('🖼️ CROP: Starting image crop process', { imageZoom, imagePosition })

      const img = new Image()
      img.onload = () => {
        console.log('🖼️ CROP: Image loaded successfully', { 
          naturalWidth: img.naturalWidth, 
          naturalHeight: img.naturalHeight 
        })
        // Set canvas to match actual chapter header proportions
        canvas.width = 280 // Typical chapter card width
        canvas.height = 192 // h-48 (192px) - matches timeline chapter height

        // Calculate scaling factors from preview to final output
        const previewWidth = 320  // w-80
        const previewHeight = 240 // h-60
        const scaleX = canvas.width / previewWidth
        const scaleY = canvas.height / previewHeight

        // Fill canvas with background
        ctx.fillStyle = '#f1f5f9' // slate-100 background
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // With CSS scale, we need to calculate differently
        // The image is scaled around its center, then translated by imagePosition
        
        // Calculate the scaled image dimensions
        const scaledImageWidth = img.naturalWidth * imageZoom
        const scaledImageHeight = img.naturalHeight * imageZoom
        
        // Calculate the position in the preview (centered + offset)
        const previewCenterX = previewWidth / 2
        const previewCenterY = previewHeight / 2
        const imageLeft = previewCenterX - (scaledImageWidth / 2) + imagePosition.x
        const imageTop = previewCenterY - (scaledImageHeight / 2) + imagePosition.y
        
        // Scale to final canvas size
        const finalImageLeft = imageLeft * scaleX
        const finalImageTop = imageTop * scaleY
        const finalImageWidth = scaledImageWidth * scaleX
        const finalImageHeight = scaledImageHeight * scaleY

        // Draw the positioned and scaled image
        ctx.drawImage(
          img,
          finalImageLeft,
          finalImageTop,
          finalImageWidth,
          finalImageHeight
        )

        // Convert canvas to blob and then to File
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'cropped-header.jpg', { type: 'image/jpeg' })
            resolve(file)
          } else {
            resolve(null)
          }
        }, 'image/jpeg', 0.9)
      }
      
      img.onerror = (error) => {
        console.error('❌ CROP: Image failed to load', error)
        resolve(null)
      }
      
      img.src = previewImageUrl
    })
  }

  // Remove header image
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

  // Handle update
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
        console.log('📤 UPLOAD: Processing header image', { 
          hasUserInteracted,
          fileSize: selectedHeaderImage.size,
          fileName: selectedHeaderImage.name
        })
        
        // Only create cropped version if user has actually interacted with positioning/zoom
        if (hasUserInteracted) {
          console.log('📤 UPLOAD: User has interacted, creating cropped image')
          try {
            const croppedImage = await createCroppedImage()
            if (croppedImage) {
              console.log('📤 UPLOAD: Cropped image created successfully', {
                originalSize: selectedHeaderImage.size,
                croppedSize: croppedImage.size
              })
              formData.append('headerImage', croppedImage)
            } else {
              console.log('📤 UPLOAD: Cropping failed, using original image')
              formData.append('headerImage', selectedHeaderImage)
            }
          } catch (cropError) {
            console.error('❌ UPLOAD: Cropping error, using original image', cropError)
            formData.append('headerImage', selectedHeaderImage)
          }
        } else {
          // User hasn't interacted - use original image
          console.log('📤 UPLOAD: No user interaction, using original image')
          formData.append('headerImage', selectedHeaderImage)
        }
      } else if (editingChapter.headerImageUrl === null) {
        console.log('📤 UPLOAD: Removing header image')
        formData.append('removeHeaderImage', 'true')
      }

      const token = await getAuthToken()
      if (!token) {
        toast.error('Authentication failed')
        return
      }

      const response = await fetch(`/api/timezones/${editingChapter.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        toast.success('Chapter updated successfully!')
        setHasUnsavedChanges(false)
        setLastSaved(new Date())
        onClose()
        onSuccess()
      } else {
        console.error('❌ UPLOAD: Server responded with error', {
          status: response.status,
          statusText: response.statusText
        })
        
        let errorMessage = 'Failed to update chapter'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
          console.error('❌ UPLOAD: Server error details', errorData)
        } catch (parseError) {
          // Server returned HTML instead of JSON (500 error page)
          const responseText = await response.text()
          console.error('❌ UPLOAD: Server returned HTML error page', {
            responseText: responseText.substring(0, 500) // First 500 chars
          })
          errorMessage = `Server error (${response.status}): ${response.statusText}`
        }
        
        toast.error(errorMessage)
      }
    } catch (error) {
      console.error('Update error:', error)
      toast.error('Failed to update chapter')
    } finally {
      setIsUpdating(false)
    }
  }

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl)
      }
    }
  }, [previewImageUrl])

  if (!isOpen || !editingChapter) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Edit Chapter</h2>
            {/* Save Status Indicator */}
            <div className="flex items-center space-x-2 mt-1">
              {isAutoSaving && (
                <div className="flex items-center space-x-1 text-blue-600">
                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs">Auto-saving...</span>
                </div>
              )}
              {hasUnsavedChanges && !isAutoSaving && (
                <span className="text-xs text-amber-600 font-medium">● Unsaved changes</span>
              )}
              {lastSaved && !hasUnsavedChanges && !isAutoSaving && (
                <span className="text-xs text-green-600">✓ Saved {lastSaved.toLocaleTimeString()}</span>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Header Image Section */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Header Image</label>
            
            {/* Enhanced Image Preview with Positioning */}
            {(previewImageUrl || editingChapter.headerImageUrl) && (
              <div className="mb-4 space-y-4">
                {/* Preview Container - Shows how image will look in chapter header */}
                <div className="relative">
                  <div className="relative w-80 h-60 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden mx-auto">
                                          <img
                        src={previewImageUrl || editingChapter.headerImageUrl || ''}
                        alt="Header preview"
                        className="absolute cursor-move select-none"
                        style={{
                          left: '50%',
                          top: '50%',
                          transform: `translate(calc(-50% + ${imagePosition.x}px), calc(-50% + ${imagePosition.y}px)) scale(${imageZoom})`,
                          maxWidth: 'none',
                          maxHeight: 'none'
                        }}
                        onMouseDown={handleMouseDown}
                        draggable={false}
                      />
                      {/* Invisible overlay to capture mouse events properly */}
                      <div
                        className="absolute inset-0 cursor-move"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        style={{ zIndex: 1 }}
                      />
                    {/* Overlay to show this is a preview */}
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      Preview
                    </div>
                  </div>
                  
                  {/* Remove Image Button */}
                  <button
                    onClick={removeHeaderImage}
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
                      onClick={() => {
                        // Reset to 100% zoom and center
                        setImageZoom(1.0)
                        setImagePosition({ x: 0, y: 0 })
                        setHasUserInteracted(true)
                      }}
                      className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Reset
                    </button>
                  </div>
                  
                  {/* Zoom Controls */}
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-slate-600 w-12">Zoom:</span>
                                          <button
                        onClick={() => handleZoomChange(imageZoom - 0.1)} // Consistent zoom steps
                        className="w-8 h-8 bg-white border border-slate-200 rounded hover:bg-slate-50 flex items-center justify-center text-slate-600"
                      >
                        -
                      </button>
                      <input
                        type="range"
                        min="0.2"
                        max="3"
                        step="0.05"
                        value={imageZoom}
                        onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <button
                        onClick={() => handleZoomChange(imageZoom + 0.1)} // Consistent zoom steps  
                        className="w-8 h-8 bg-white border border-slate-200 rounded hover:bg-slate-50 flex items-center justify-center text-slate-600"
                      >
                        +
                      </button>
                    <span className="text-xs text-slate-600 w-12">{Math.round(imageZoom * 100)}%</span>
                  </div>
                  
                                      {/* Instructions */}
                    <p className="text-xs text-slate-500 italic">
                      💡 Image starts fitted to container. Zoom in to focus on specific areas, drag to reposition. The preview shows exactly how it will appear in your chapter header!
                    </p>
                </div>
              </div>
            )}
            
            {/* Image Placeholder when no image - clickable to choose file */}
            {!previewImageUrl && !editingChapter.headerImageUrl && (
              <div className="mb-4">
                <label 
                  htmlFor="chapter-image-input"
                  className="block w-80 h-60 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center mx-auto text-slate-500 hover:border-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <ImageIcon size={48} className="mb-3 text-slate-400" />
                  <p className="text-sm font-medium mb-1">Click to choose chapter image</p>
                  <p className="text-xs text-center px-4">JPG, PNG or GIF up to 10MB</p>
                </label>
              </div>
            )}
            
            {/* File Input */}
            <input
              id="chapter-image-input"
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className={`${(!previewImageUrl && !editingChapter.headerImageUrl) ? 'hidden' : 'block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100'}`}
            />
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
            <label className="block text-sm font-semibold text-slate-900 mb-2">Description</label>
            <textarea
              value={editingChapter.description}
              onChange={(e) => setEditingChapter({ ...editingChapter, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent resize-none"
              placeholder="Chapter description"
            />
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
            onClick={handleClose}
            className="px-6 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdateChapter}
            disabled={isUpdating || !editingChapter.title.trim()}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? 'Updating...' : 'Update Chapter'}
          </button>
        </div>
      </div>

      {/* Unsaved Changes Warning Modal */}
      {showUnsavedWarning && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Unsaved Changes</h3>
              <p className="text-slate-600 mb-6">
                You have unsaved changes. Would you like to save them before closing?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={forceClose}
                  className="flex-1 px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
                >
                  Don't Save
                </button>
                <button
                  onClick={() => setShowUnsavedWarning(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                >
                  Continue Editing
                </button>
                <button
                  onClick={saveAndClose}
                  className="flex-1 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors"
                >
                  Save & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 