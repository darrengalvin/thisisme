import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
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

  // Set up editing state when chapter changes
  useEffect(() => {
    if (chapter && isOpen) {
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
      // Reset image positioning
      setImageZoom(1)
      setImagePosition({ x: 0, y: 0 })
    }
  }, [chapter, isOpen])

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
      // Reset image positioning for new image
      setImageZoom(1)
      setImagePosition({ x: 0, y: 0 })
    }
  }

  // Image positioning handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - imagePosition.x, y: e.clientY - imagePosition.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setImagePosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleZoomChange = (newZoom: number) => {
    setImageZoom(Math.max(0.5, Math.min(3, newZoom)))
  }

  // Create cropped image based on current position and zoom
  const createCroppedImage = (): Promise<File | null> => {
    return new Promise((resolve) => {
      if (!previewImageUrl) {
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
        // Set canvas to chapter header dimensions (16:5 aspect ratio)
        canvas.width = 400
        canvas.height = 128 // Same as h-32 (128px)

        // Calculate how the image fits in the preview container (128px height)
        const previewHeight = 128
        const previewWidth = 400
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
        const scaledWidth = displayWidth * imageZoom
        const scaledHeight = displayHeight * imageZoom

        // Fill the entire canvas with the image, cropping as needed
        ctx.fillStyle = '#f1f5f9' // slate-100 background
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Draw the positioned and scaled image
        ctx.drawImage(
          img,
          imagePosition.x,
          imagePosition.y,
          scaledWidth,
          scaledHeight
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
        // If user has positioned/zoomed the image, create cropped version
        if (imageZoom !== 1 || imagePosition.x !== 0 || imagePosition.y !== 0) {
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
        onClose()
        onSuccess()
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
          <h2 className="text-2xl font-bold text-slate-900">Edit Chapter</h2>
          <button
            onClick={onClose}
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
                  <div className="relative h-32 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden">
                    <img
                      src={previewImageUrl || editingChapter.headerImageUrl || ''}
                      alt="Header preview"
                      className="absolute cursor-move select-none"
                      style={{
                        width: `${100 * imageZoom}%`,
                        height: `${100 * imageZoom}%`,
                        transform: `translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                        minWidth: '100%',
                        minHeight: '100%',
                        objectFit: 'cover'
                      }}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      draggable={false}
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
                        setImageZoom(1)
                        setImagePosition({ x: 0, y: 0 })
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
                      onClick={() => handleZoomChange(imageZoom - 0.1)}
                      className="w-8 h-8 bg-white border border-slate-200 rounded hover:bg-slate-50 flex items-center justify-center text-slate-600"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={imageZoom}
                      onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                      className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <button
                      onClick={() => handleZoomChange(imageZoom + 0.1)}
                      className="w-8 h-8 bg-white border border-slate-200 rounded hover:bg-slate-50 flex items-center justify-center text-slate-600"
                    >
                      +
                    </button>
                    <span className="text-xs text-slate-600 w-12">{Math.round(imageZoom * 100)}%</span>
                  </div>
                  
                  {/* Instructions */}
                  <p className="text-xs text-slate-500 italic">
                    💡 Drag the image to reposition it, use zoom controls to scale. Preview shows how it will appear in your chapter.
                  </p>
                </div>
              </div>
            )}
            
            {/* File Input */}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
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
            onClick={onClose}
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
    </div>
  )
} 