import React, { useState, useEffect, useRef } from 'react'
import { X, Image as ImageIcon, Move, Upload } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@supabase/supabase-js'
import toast from 'react-hot-toast'
import { TimeZoneWithRelations, MemoryWithRelations } from '@/lib/types'
import ImageCropper from '@/components/ImageCropper'

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
  memories?: MemoryWithRelations[]
}

export default function EditChapterModal({ chapter, isOpen, onClose, onSuccess }: EditChapterModalProps) {
  const { user } = useAuth()
  const [editingChapter, setEditingChapter] = useState<EditingChapter | null>(null)
  const [selectedHeaderImage, setSelectedHeaderImage] = useState<File | null>(null)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showImageCropper, setShowImageCropper] = useState(false)
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null)
  const [originalChapter, setOriginalChapter] = useState<EditingChapter | null>(null)

  // Enhanced memory sorting with error handling and validation
  const sortMemories = (memories: MemoryWithRelations[] | undefined): MemoryWithRelations[] => {
    if (!memories || !Array.isArray(memories)) return []
    
    return [...memories].sort((a, b) => {
      try {
        const dateA = new Date(a.memoryDate || a.createdAt || 0).getTime()
        const dateB = new Date(b.memoryDate || b.createdAt || 0).getTime()
        
        if (isNaN(dateA) || isNaN(dateB)) {
          console.warn('Invalid date detected in memory sorting')
          return 0
        }
        
        return dateA - dateB
      } catch (error) {
        console.error('Error sorting memories:', error)
        return 0
      }
    })
  }

  // Helper function to format date for input
  const formatDateForInput = (dateString: string | null): string => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return ''
      return date.toISOString().split('T')[0]
    } catch (error) {
      console.error('Error formatting date:', error)
      return ''
    }
  }

  // Set up editing state when chapter changes with enhanced error handling
  useEffect(() => {
    if (chapter && isOpen) {
      try {
        const sortedMemories = sortMemories(chapter.memories)
        
        const initialChapter = {
          id: chapter.id,
          title: chapter.title,
          description: chapter.description || '',
          startDate: formatDateForInput(chapter.startDate),
          endDate: formatDateForInput(chapter.endDate),
          location: chapter.location || '',
          headerImageUrl: chapter.headerImageUrl || null,
          memories: sortedMemories
        }
        
        setEditingChapter(initialChapter)
        setOriginalChapter({ ...initialChapter })
        setSelectedHeaderImage(null)
        setPreviewImageUrl(null)
      } catch (error) {
        console.error('Error initializing chapter editing:', error)
        toast.error('Error loading chapter data')
        onClose()
      }
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
      setSelectedHeaderImage(croppedFile)
      // Create preview of cropped image
      if (previewImageUrl) {
        URL.revokeObjectURL(previewImageUrl)
      }
      const newPreviewUrl = URL.createObjectURL(croppedFile)
      setPreviewImageUrl(newPreviewUrl)
    }
    setShowImageCropper(false)
    setTempImageUrl(null)
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
          fileSize: selectedHeaderImage.size,
          fileName: selectedHeaderImage.name
        })
        
        formData.append('headerImage', selectedHeaderImage)
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
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Only close if clicking the backdrop, not the modal content
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Edit Chapter</h2>
          </div>
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
            
            {/* Image Preview */}
            {(previewImageUrl || editingChapter.headerImageUrl) && (
              <div className="mb-4 space-y-4">
                {/* Preview Container */}
                <div className="relative">
                  <div className="relative w-80 mx-auto rounded-lg overflow-hidden border-2 border-slate-200">
                    <img
                      src={previewImageUrl || editingChapter.headerImageUrl || ''}
                      alt="Chapter header"
                      className="w-full h-52 object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      Preview
                    </div>
                  </div>
                  
                  {/* Remove Image Button */}
                  <button
                    onClick={removeHeaderImage}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center space-x-3">
                  <button
                    onClick={() => {
                      setTempImageUrl(previewImageUrl || editingChapter.headerImageUrl)
                      setShowImageCropper(true)
                    }}
                    className="inline-flex items-center space-x-2 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Move size={16} />
                    <span>Adjust Position</span>
                  </button>
                </div>
                
                <p className="text-xs text-slate-500 text-center">
                  {selectedHeaderImage ? 'Image has been cropped and positioned' : 'Current chapter image'}
                </p>
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
            
            {/* File Input - Always available for changing image */}
            <div className="mt-4">
              <label className="inline-flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg cursor-pointer transition-colors">
                <Upload size={16} />
                <span>{previewImageUrl || editingChapter.headerImageUrl ? 'Change Image' : 'Choose Image'}</span>
                <input
                  id="chapter-image-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
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
          aspectRatio={280 / 192}
          outputWidth={280}
          outputHeight={192}
        />
      )}
    </div>
  )
}
