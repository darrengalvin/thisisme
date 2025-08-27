'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, ArrowLeft, Calendar, Clock, X, Check, Upload, Image as ImageIcon, Move, Mic, Crown, Sparkles } from 'lucide-react'
import { useAuth } from './AuthProvider'
import toast from 'react-hot-toast'
import ImageCropper from './ImageCropper'
import VoiceRecorder from './VoiceRecorder'
import UpgradeModal from './UpgradeModal'

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
  const [showImageCropper, setShowImageCropper] = useState(false)
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null)
  const [isPremiumUser, setIsPremiumUser] = useState(false)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [premiumLoading, setPremiumLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const totalSteps = 4

  useEffect(() => {
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
        console.log('📡 CREATE CHAPTER: Getting auth token for premium status check...')
        const tokenResponse = await fetch('/api/auth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, email: user.email }),
        })

        if (!tokenResponse.ok) {
          console.error('❌ CREATE CHAPTER: Failed to get auth token for premium check')
          throw new Error('Failed to get auth token')
        }

        const { token } = await tokenResponse.json()
        console.log('✅ CREATE CHAPTER: Got auth token for premium check')

        console.log('📡 CREATE CHAPTER: Calling /api/user/premium-status with JWT token...')
        const response = await fetch('/api/user/premium-status', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        })

        console.log('📊 CREATE CHAPTER: Premium status response:', response.status, response.ok)

        if (response.ok) {
          const data = await response.json()
          console.log('📊 CREATE CHAPTER: Premium status data:', data)
          setIsPremiumUser(data.isPremium)
          console.log('🔄 CREATE CHAPTER: Premium status updated:', data.isPremium)
        } else {
          console.error('❌ CREATE CHAPTER: Premium status check failed:', response.status)
        }
      } catch (error) {
        console.error('❌ CREATE CHAPTER: Error checking premium status:', error)
      } finally {
        setPremiumLoading(false)
        console.log('✅ CREATE CHAPTER: Premium status check completed')
      }
    }
    
    checkPremiumStatus()
  }, [user])

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
      
      // Create preview URL and show cropper
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string
        setTempImageUrl(imageUrl)
        setShowImageCropper(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCropComplete = (croppedImage: File | null) => {
    if (croppedImage) {
      setHeaderImage(croppedImage)
      // Create preview of cropped image
      const reader = new FileReader()
      reader.onload = (e) => {
        setHeaderImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(croppedImage)
    }
    setShowImageCropper(false)
    setTempImageUrl(null)
  }

  const handleVoiceRecord = () => {
    if (!isPremiumUser) {
      setShowUpgradeModal(true)
      return
    }
    
    setShowVoiceRecorder(true)
  }

  const handleVoiceTranscription = (transcribedText: string) => {
    setDescription(prev => prev ? `${prev}\n\n${transcribedText}` : transcribedText)
    setShowVoiceRecorder(false)
  }

  const removeImage = () => {
    setHeaderImage(null)
    setHeaderImagePreview(null)
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
        formData.append('file', headerImage)

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
                className="w-full px-4 py-3 text-lg border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent"
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
                  {/* Image Preview */}
                  <div className="relative">
                    <div className="relative max-w-md mx-auto rounded-lg overflow-hidden border-2 border-slate-200">
                      <img
                        src={headerImagePreview}
                        alt="Chapter preview"
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        Preview
                      </div>
                    </div>
                    
                    {/* Remove Image Button */}
                    <button
                      onClick={removeImage}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center space-x-3">
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
                    <button
                      onClick={() => {
                        setTempImageUrl(headerImagePreview)
                        setShowImageCropper(true)
                      }}
                      className="inline-flex items-center space-x-2 bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      <Move size={16} />
                      <span>Adjust Position</span>
                    </button>
                  </div>
                  
                  <p className="text-xs text-slate-500 text-center">
                    Image has been cropped and positioned for optimal display
                  </p>
                </div>
              ) : (
                <label className="block border-2 border-dashed border-slate-300 rounded-xl p-8 hover:border-slate-400 transition-colors cursor-pointer">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                    <span className="text-slate-600 font-medium">Click to upload an image</span>
                    <p className="text-sm text-slate-500 mt-2">JPG, PNG or GIF up to 10MB</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                </label>
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
              <div className="flex items-center justify-center space-x-2 mb-2">
                <h2 className="text-2xl font-bold text-slate-900">Add a description? (Optional)</h2>
                {isPremiumUser && (
                  <div className="flex items-center space-x-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                    <Crown size={12} />
                    <span className="font-medium">PRO</span>
                  </div>
                )}
              </div>
              <p className="text-slate-600">Tell us a bit about what this chapter was like</p>
            </div>
            <div className="max-w-md mx-auto">
              <div className="relative">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="This was when I was studying at university, living in student accommodation, making lifelong friends..."
                  rows={4}
                  className={`w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent resize-none ${isPremiumUser ? 'pr-16' : ''}`}
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
                <div className="mt-2 text-xs text-slate-500 flex items-center justify-center space-x-1">
                  <Sparkles size={12} className="text-slate-600" />
                  <span>Click the microphone to use AI voice transcription</span>
                </div>
              )}
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