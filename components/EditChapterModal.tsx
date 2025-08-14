import React, { useState, useEffect, useRef } from 'react'
import { X, Image as ImageIcon, Move, Upload } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@supabase/supabase-js'
import toast from 'react-hot-toast'
import { TimeZoneWithRelations } from '@/lib/types'
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
}

export default function EditChapterModal({ chapter, isOpen, onClose, onSuccess }: EditChapterModalProps) {
  const { user } = useAuth()
  const [editingChapter, setEditingChapter] = useState<EditingChapter | null>(null)
  const [selectedHeaderImage, setSelectedHeaderImage] = useState<File | null>(null)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showImageCropper, setShowImageCropper] = useState(false)
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null)

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

  // Cleanup timeout on unmount and add comprehensive protection
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault()
        handleClose() // Use handleClose instead of onClose to check for unsaved changes
      }
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && isOpen) {
        event.preventDefault()
        event.returnValue = '' // This triggers the browser's native unsaved changes dialog
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey)
      window.addEventListener('beforeunload', handleBeforeUnload)
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [isOpen, hasUnsavedChanges])

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
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Only close if clicking the backdrop, not the modal content
        if (e.target === e.currentTarget) {
          handleClose() // Use handleClose to check for unsaved changes
        }
      }}
    >
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
          {/* Debug Info - Remove this after fixing */}
          <div className="bg-gray-100 p-2 rounded text-xs">
            <strong>DEBUG EditChapterModal:</strong><br/>
            editingChapter.headerImageUrl = {editingChapter?.headerImageUrl || 'null'}<br/>
            previewImageUrl = {previewImageUrl || 'null'}<br/>
            Should show image section: {(previewImageUrl || editingChapter?.headerImageUrl) ? 'YES' : 'NO'}
          </div>

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