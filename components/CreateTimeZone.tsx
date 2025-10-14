'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, ArrowLeft, Calendar, Clock, X, Check, Upload, Image as ImageIcon, Move, Mic, Crown, Sparkles, Save, CheckCircle, AlertCircle } from 'lucide-react'
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
  const [startAge, setStartAge] = useState('')
  const [durationValue, setDurationValue] = useState('')
  const [durationUnit, setDurationUnit] = useState<'months' | 'years'>('years')
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
  
  // Portal mounting state for SSR compatibility
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Auto-save functionality for draft
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const totalSteps = 4

  // Auto-save draft to localStorage
  const saveDraft = useCallback(() => {
    const draft = {
      title,
      startYear,
      endYear,
      startAge,
      durationValue,
      durationUnit,
      description,
      currentStep,
      timestamp: new Date().toISOString()
    }
    localStorage.setItem('chapter-draft', JSON.stringify(draft))
    setLastSaved(new Date())
    setHasUnsavedChanges(false)
    console.log('📝 Draft saved to localStorage')
  }, [title, startYear, endYear, startAge, durationValue, durationUnit, description, currentStep])

  // Load draft from localStorage
  const loadDraft = useCallback(() => {
    try {
      const savedDraft = localStorage.getItem('chapter-draft')
      if (savedDraft) {
        const draft = JSON.parse(savedDraft)
        // Only load if draft is less than 24 hours old
        const draftAge = Date.now() - new Date(draft.timestamp).getTime()
        if (draftAge < 24 * 60 * 60 * 1000) {
          setTitle(draft.title || '')
          setStartYear(draft.startYear || '')
          setEndYear(draft.endYear || '')
          setStartAge(draft.startAge || '')
          setDurationValue(draft.durationValue || '')
          setDurationUnit(draft.durationUnit || 'years')
          setDescription(draft.description || '')
          setCurrentStep(draft.currentStep || 1)
          setLastSaved(new Date(draft.timestamp))
          console.log('📝 Draft loaded from localStorage')
        } else {
          localStorage.removeItem('chapter-draft')
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error)
      localStorage.removeItem('chapter-draft')
    }
  }, [])

  // Clear draft
  const clearDraft = useCallback(() => {
    localStorage.removeItem('chapter-draft')
    setLastSaved(null)
    setHasUnsavedChanges(false)
  }, [])

  // Check for unsaved changes
  useEffect(() => {
    const hasChanges = title.trim() || startYear || endYear || startAge || durationValue || description.trim()
    setHasUnsavedChanges(!!hasChanges)
  }, [title, startYear, endYear, startAge, durationValue, description])

  // Auto-save effect
  useEffect(() => {
    if (!hasUnsavedChanges) return

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(() => {
      setIsAutoSaving(true)
      setAutoSaveError(null)
      
      try {
        saveDraft()
      } catch (error) {
        console.error('Auto-save error:', error)
        setAutoSaveError('Failed to save draft')
      } finally {
        setIsAutoSaving(false)
      }
    }, 3000) // Auto-save after 3 seconds of inactivity

    // Cleanup timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [hasUnsavedChanges, saveDraft])

  // Load draft on mount
  useEffect(() => {
    loadDraft()
  }, [loadDraft])

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

  // Handle cancel with unsaved changes warning
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      const shouldCancel = window.confirm(
        'You have unsaved changes. Are you sure you want to close? Your draft will be lost.'
      )
      if (!shouldCancel) return
    }
    clearDraft()
    onCancel?.()
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
          startAge: startAge ? parseInt(startAge) : undefined,
          durationValue: durationValue ? parseInt(durationValue) : undefined,
          durationUnit: durationValue ? durationUnit : undefined,
          headerImageUrl
        })
      })

      if (response.ok) {
        console.log('✅ CREATE CHAPTER: Chapter created successfully')
        toast.success('Life chapter created!')
        clearDraft() // Clear the draft since chapter was successfully created
        setTitle('')
        setStartYear('')
        setEndYear('')
        setStartAge('')
        setDurationValue('')
        setDurationUnit('years')
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
              
              {/* Age and Duration Fields */}
              <div className="pt-6 border-t border-slate-200 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">I was about this age (Optional)</label>
                  <input
                    type="number"
                    value={startAge}
                    onChange={(e) => setStartAge(e.target.value)}
                    placeholder="25"
                    min="0"
                    max="120"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent text-center"
                  />
                  <p className="text-xs text-slate-500 mt-1">Your age when this chapter started</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">It went on for (Optional)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={durationValue}
                      onChange={(e) => setDurationValue(e.target.value)}
                      placeholder="3"
                      min="0"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent text-center"
                    />
                    <select
                      value={durationUnit}
                      onChange={(e) => setDurationUnit(e.target.value as 'months' | 'years')}
                      className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white"
                    >
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">How long this chapter lasted</p>
                </div>
              </div>
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
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-white overflow-hidden">
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-slate-600 to-slate-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Clock size={20} className="text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">Create Life Chapter</h1>
                <div className="flex items-center space-x-3 sm:space-x-4 flex-wrap">
                  <p className="text-slate-600 text-sm">Step {currentStep} of {totalSteps}</p>
                  {/* Auto-save status indicator */}
                  {isAutoSaving ? (
                    <div className="flex items-center space-x-1 text-blue-600 text-xs sm:text-sm">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                      <span>Saving draft...</span>
                    </div>
                  ) : lastSaved && !hasUnsavedChanges ? (
                    <div className="flex items-center space-x-1 text-green-600 text-xs sm:text-sm">
                      <CheckCircle size={14} />
                      <span>Draft saved</span>
                    </div>
                  ) : hasUnsavedChanges ? (
                    <div className="flex items-center space-x-1 text-amber-600 text-xs sm:text-sm">
                      <AlertCircle size={14} />
                      <span>Unsaved changes</span>
                    </div>
                  ) : null}
                  {autoSaveError && (
                    <div className="flex items-center space-x-1 text-red-600 text-xs sm:text-sm">
                      <AlertCircle size={14} />
                      <span>Save failed</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {onCancel && (
              <button
                onClick={handleCancel}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg flex-shrink-0 transition-colors"
                title={hasUnsavedChanges ? "You have unsaved changes" : "Close"}
              >
                <X size={20} />
              </button>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-slate-600 to-slate-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 sm:py-12 pb-32">
          {renderStepContent()}
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

      {/* Fixed Bottom Navigation - Rendered via Portal for true fixed positioning */}
      {isMounted && createPortal(
        <div 
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg overflow-x-hidden"
          style={{
            position: 'fixed',
            zIndex: 9999,
            transform: 'translate3d(0, 0, 0)',
            WebkitTransform: 'translate3d(0, 0, 0)',
            willChange: 'transform'
          }}
        >
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex justify-between items-center">
              <button
                onClick={handlePrev}
                disabled={currentStep === 1}
                className="flex items-center space-x-2 px-3 sm:px-4 py-2 text-slate-600 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              
              {currentStep < totalSteps ? (
                <button
                  onClick={handleNext}
                  className="flex items-center space-x-2 bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-700 hover:to-slate-600 text-white px-4 sm:px-6 py-3 rounded-xl font-medium transition-all duration-200 active:scale-95 shadow-lg text-sm sm:text-base min-w-0"
                >
                  <span className="truncate">Next</span>
                  <ArrowRight size={16} className="flex-shrink-0" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex items-center space-x-2 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-800 hover:to-slate-700 text-white px-4 sm:px-6 py-3 rounded-xl font-medium transition-all duration-200 active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base min-w-0"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white flex-shrink-0"></div>
                      <span className="truncate">Creating...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} className="flex-shrink-0" />
                      <span className="truncate">Create Chapter</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
} 