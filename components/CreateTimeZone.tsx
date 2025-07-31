'use client'

import { useState } from 'react'
import { ArrowRight, ArrowLeft, Calendar, Clock, X, Check, Upload, Image as ImageIcon } from 'lucide-react'
import { useAuth } from './AuthProvider'
import toast from 'react-hot-toast'

interface CreateTimeZoneProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export default function CreateTimeZone({ onSuccess, onCancel }: CreateTimeZoneProps) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [title, setTitle] = useState('')
  const [startYear, setStartYear] = useState('')
  const [endYear, setEndYear] = useState('')
  const [description, setDescription] = useState('')
  const [headerImage, setHeaderImage] = useState<File | null>(null)
  const [headerImagePreview, setHeaderImagePreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Image positioning state
  const [imageZoom, setImageZoom] = useState(1)
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [hasUserInteracted, setHasUserInteracted] = useState(false)

  const totalSteps = 4

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

  const formatYearRange = () => {
    if (!startYear && !endYear) return ''
    
    if (startYear && endYear) {
      return startYear === endYear ? startYear : `${startYear} - ${endYear}`
    } else if (startYear) {
      return `From ${startYear}`
    } else if (endYear) {
      return `Until ${endYear}`
    }
    
    return ''
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('Image must be smaller than 10MB')
        return
      }
      
      setHeaderImage(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string
        setHeaderImagePreview(imageUrl)
        
        // Calculate initial zoom to show FULL image (not cropped)
        const img = new Image()
        img.onload = () => {
          const previewWidth = 320 // w-80
          const previewHeight = 240 // h-60
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
          initialZoom = Math.max(0.1, Math.min(1, initialZoom))
          
          setImageZoom(initialZoom)
          setImagePosition({ x: 0, y: 0 }) // Center the image
          setHasUserInteracted(false) // Reset interaction tracking
        }
        img.src = imageUrl
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setHeaderImage(null)
    setHeaderImagePreview(null)
    // Reset image positioning
    setImageZoom(1)
    setImagePosition({ x: 0, y: 0 })
    setHasUserInteracted(false)
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
    
    // Add boundary checking to prevent image from being dragged completely out of view
    const previewWidth = 320 // w-80
    const previewHeight = 240 // h-60
    const imageWidth = previewWidth * imageZoom
    const imageHeight = previewHeight * imageZoom
    
    const minX = -(imageWidth - previewWidth)
    const maxX = 0
    const minY = -(imageHeight - previewHeight)
    const maxY = 0
    
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
    // Dynamic zoom range - allow zooming out to see full image, zooming in to 5x
    const minZoom = 0.05 // Allow very small zoom to see full image
    const maxZoom = 5    // Allow zooming in quite a bit
    const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom))
    setImageZoom(clampedZoom)
    setHasUserInteracted(true) // User is adjusting zoom
    
    // Adjust position to keep image in bounds when zoom changes
    const previewWidth = 320 // w-80
    const previewHeight = 240 // h-60
    const imageWidth = previewWidth * clampedZoom
    const imageHeight = previewHeight * clampedZoom
    
    const minX = -(imageWidth - previewWidth)
    const maxX = 0
    const minY = -(imageHeight - previewHeight)
    const maxY = 0
    
    setImagePosition(prev => ({
      x: Math.max(minX, Math.min(maxX, prev.x)),
      y: Math.max(minY, Math.min(maxY, prev.y))
    }))
  }

  // Create cropped image based on current position and zoom
  const createCroppedImage = (): Promise<File | null> => {
    return new Promise((resolve) => {
      if (!headerImagePreview) {
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
                 // Set canvas to match actual chapter header proportions (closer to real output)
                 canvas.width = 280 // Typical chapter card width
        canvas.height = 192 // h-48 (192px) - matches timeline chapter height

         // Calculate how the image fits in the preview container
         const previewHeight = 240 // h-60
         const previewWidth = 320  // w-80
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
      
      img.src = headerImagePreview
    })
  }

  const handleNext = () => {
    if (currentStep === 1 && !title.trim()) {
      toast.error('Please give your chapter a title')
      return
    }
    if (currentStep === 2 && !startYear && !endYear) {
      toast.error('Please provide at least a start year or end year')
      return
    }
    setCurrentStep(prev => Math.min(prev + 1, totalSteps))
  }

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Please give your chapter a title')
      return
    }

    if (!startYear && !endYear) {
      toast.error('Please provide at least a start year or end year')
      return
    }

    if (!user) {
      toast.error('Authentication required')
      return
    }

    setIsLoading(true)

    try {
      console.log('🔑 CREATE CHAPTER: Getting auth token for user:', user.id)
      const token = await getAuthToken()
      if (!token) {
        toast.error('Failed to authenticate')
        setIsLoading(false)
        return
      }

      let headerImageUrl = null

      // Upload header image if provided
      if (headerImage) {
        console.log('📤 CREATE CHAPTER: Uploading header image')
        const formData = new FormData()
        
        // Only create cropped version if user has actually interacted with positioning/zoom
        if (hasUserInteracted) {
          console.log('🎨 CREATE CHAPTER: Creating cropped image based on user positioning')
          const croppedImage = await createCroppedImage()
          if (croppedImage) {
            formData.append('file', croppedImage)
          } else {
            formData.append('file', headerImage)
          }
        } else {
          // User hasn't interacted - use original image
          console.log('📷 CREATE CHAPTER: Using original image (no user interaction)')
          formData.append('file', headerImage)
        }

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        })

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json()
          headerImageUrl = uploadData.url
          console.log('✅ CREATE CHAPTER: Header image uploaded:', headerImageUrl)
        } else {
          const errorData = await uploadResponse.json().catch(() => ({ error: 'Upload failed' }))
          console.error('❌ CREATE CHAPTER: Failed to upload header image:', uploadResponse.status, errorData)
          toast.error(errorData.error || 'Failed to upload header image')
          setIsLoading(false)
          return
        }
      }

      const startDate = startYear ? `${startYear}-01-01` : undefined
      const endDate = endYear ? `${endYear}-12-31` : undefined

      console.log('📝 CREATE CHAPTER: Creating chapter with data:', {
        title: title.trim(),
        description: description.trim() || undefined,
        startDate,
        endDate,
        headerImageUrl
      })

      const response = await fetch('/api/timezones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          type: 'PRIVATE', // Default to private for now
          startDate,
          endDate,
          headerImageUrl
        })
      })

      if (response.ok) {
        console.log('✅ CREATE CHAPTER: Chapter created successfully')
        toast.success('Life chapter created!')
        setTitle('')
        setStartYear('')
        setEndYear('')
        setDescription('')
        setHeaderImage(null)
        setHeaderImagePreview(null)
        // Reset image positioning
        setImageZoom(1)
        setImagePosition({ x: 0, y: 0 })
        setHasUserInteracted(false)
        onSuccess?.()
      } else {
        console.error('❌ CREATE CHAPTER: Failed to create chapter:', response.status)
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to create life chapter')
      }
    } catch (error) {
      console.error('Error creating life chapter:', error)
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-gradient-to-r from-slate-600 to-slate-500 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">📖</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">What would you like to call this chapter?</h2>
              <p className="text-slate-600">Give your life chapter a meaningful name</p>
            </div>
            <div className="max-w-md mx-auto">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., University Days, Living in London, The Hotel Years..."
                className="w-full px-4 py-3 text-lg border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent text-center"
                autoFocus
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-gradient-to-r from-slate-600 to-slate-500 rounded-full flex items-center justify-center mx-auto">
              <Calendar className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">When did this chapter happen?</h2>
              <p className="text-slate-600">Approximate years are fine - this helps place it on your timeline</p>
            </div>
            <div className="max-w-sm mx-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Start Year</label>
                  <input
                    type="number"
                    value={startYear}
                    onChange={(e) => setStartYear(e.target.value)}
                    placeholder="1995"
                    min="1900"
                    max="2030"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent text-center"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">End Year</label>
                  <input
                    type="number"
                    value={endYear}
                    onChange={(e) => setEndYear(e.target.value)}
                    placeholder="2000"
                    min={startYear || "1900"}
                    max="2030"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent text-center"
                  />
                </div>
              </div>
              {formatYearRange() && (
                <div className="p-3 bg-slate-100 rounded-lg">
                  <div className="flex items-center justify-center space-x-2 text-slate-700">
                    <Clock size={16} />
                    <span className="font-medium">{formatYearRange()}</span>
                  </div>
                </div>
              )}
              <p className="text-sm text-slate-500">
                💡 You can leave end year blank if it's ongoing or you're not sure
              </p>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-gradient-to-r from-slate-600 to-slate-500 rounded-full flex items-center justify-center mx-auto">
              <ImageIcon className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Add a chapter image? (Optional)</h2>
              <p className="text-slate-600">A visual representation of this period in your life</p>
            </div>
            <div className="max-w-md mx-auto">
              {headerImagePreview ? (
                <div className="space-y-4">
                  {/* Enhanced Preview with Positioning Controls */}
                  <div className="relative">
                                         <div className="relative w-80 h-60 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden mx-auto">
                                              <img
                          src={headerImagePreview}
                          alt="Chapter preview"
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
                      {/* Preview Label */}
                      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        Preview
                      </div>
                    </div>
                    
                    {/* Remove Image Button */}
                    <button
                      onClick={removeImage}
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
                          setHasUserInteracted(true) // User is resetting position
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
                         onClick={() => handleZoomChange(imageZoom * 0.8)} // Better scaling for zoom out
                         className="w-8 h-8 bg-white border border-slate-200 rounded hover:bg-slate-50 flex items-center justify-center text-slate-600"
                       >
                         -
                       </button>
                       <input
                         type="range"
                         min="0.05"
                         max="5"
                         step="0.05"
                         value={imageZoom}
                         onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                         className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                       />
                       <button
                         onClick={() => handleZoomChange(imageZoom * 1.25)} // Better scaling for zoom in
                         className="w-8 h-8 bg-white border border-slate-200 rounded hover:bg-slate-50 flex items-center justify-center text-slate-600"
                       >
                         +
                       </button>
                      <span className="text-xs text-slate-600 w-12">{Math.round(imageZoom * 100)}%</span>
                    </div>
                    
                                         {/* Instructions */}
                     <p className="text-xs text-slate-500 italic">
                       💡 Your full image is shown first (never cropped on upload). Zoom in to focus on details, drag to reposition. Preview shows exactly how it will appear in your chapter!
                     </p>
                  </div>

                  {/* Change Image Button */}
                  <div className="text-center">
                    <label className="inline-flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg cursor-pointer transition-colors">
                      <Upload size={16} />
                      <span>Change Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 hover:border-slate-400 transition-colors">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                    <label className="cursor-pointer">
                      <span className="text-slate-600 font-medium">Click to upload an image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="text-sm text-slate-500 mt-2">JPG, PNG or GIF up to 10MB</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      case 4:
        return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-gradient-to-r from-slate-600 to-slate-500 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">✨</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Add a description? (Optional)</h2>
              <p className="text-slate-600">Tell us a bit about what this chapter was like</p>
            </div>
            <div className="max-w-md mx-auto">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="This was when I was studying at university, living in student accommodation, making lifelong friends..."
                rows={4}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent resize-none"
              />
            </div>
            <div className="bg-slate-50 rounded-xl p-4 max-w-md mx-auto">
              <h3 className="font-semibold text-slate-900 mb-3">Chapter Summary:</h3>
              <div className="text-left space-y-3 text-slate-600">
                <p><strong>Title:</strong> {title}</p>
                <p><strong>Period:</strong> {formatYearRange() || 'Not specified'}</p>
                {headerImagePreview && (
                  <div>
                    <strong>Header Image:</strong>
                    <img 
                      src={headerImagePreview} 
                      alt="Chapter preview" 
                      className="w-full h-24 object-cover rounded-lg mt-1 border border-slate-200"
                    />
                  </div>
                )}
                {description && <p><strong>Description:</strong> {description}</p>}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-slate-600 to-slate-500 rounded-2xl flex items-center justify-center">
                <Clock size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Create Life Chapter</h1>
                <p className="text-slate-600">Step {currentStep} of {totalSteps}</p>
              </div>
            </div>
            {onCancel && (
              <button
                onClick={onCancel}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={20} />
              </button>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-slate-600 to-slate-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        {renderStepContent()}
        
        {/* Navigation */}
        <div className="flex justify-between items-center mt-12">
          <button
            onClick={handlePrev}
            disabled={currentStep === 1}
            className="flex items-center space-x-2 px-4 py-2 text-slate-600 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          
          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              className="flex items-center space-x-2 bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-700 hover:to-slate-600 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <span>Next</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex items-center space-x-2 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-800 hover:to-slate-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Create Chapter</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
} 