'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, Calendar, Clock, Upload, X, Check, Mic, Crown, Sparkles, Crop } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import VoiceRecorder from '@/components/VoiceRecorder'
import ImageCropper from '@/components/ImageCropper'
import NotificationModal from './NotificationModal'

interface AddMemoryWizardProps {
  chapterId: string | null
  chapterTitle?: string
  onComplete: () => void
  onCancel: () => void
}

interface MemoryData {
  title: string
  description: string
  dateType: 'exact' | 'rough' | 'approximate' | 'estimated' | 'within-chapter'
  exactDate?: string
  roughDate?: string
  approximateDate?: string
  estimatedDate?: string
  files: File[]
}

export default function AddMemoryWizard({ chapterId, chapterTitle, onComplete, onCancel }: AddMemoryWizardProps) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [memoryData, setMemoryData] = useState<MemoryData>({
    title: '',
    description: '',
    dateType: 'within-chapter',
    files: []
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPremiumUser, setIsPremiumUser] = useState(false)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [premiumLoading, setPremiumLoading] = useState(true)
  const [showImageCropper, setShowImageCropper] = useState(false)
  const [tempImageForCrop, setTempImageForCrop] = useState<{ file: File, index: number } | null>(null)
  const [showPremiumNotification, setShowPremiumNotification] = useState(false)

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
        const response = await fetch('/api/user/premium-status')
        if (response.ok) {
          const data = await response.json()
          setIsPremiumUser(data.isPremium)
        }
      } catch (error) {
        console.error('Error checking premium status:', error)
      } finally {
        setPremiumLoading(false)
      }
    }
    
    checkPremiumStatus()
  }, [user])

  const steps = [
    {
      id: 1,
      title: `Adding memory to "${chapterTitle}"`,
      subtitle: "Tell us about this memory"
    },
    {
      id: 2,
      title: "When in this chapter did it happen?",
      subtitle: "Help us place it within your chapter timeline"
    },
    {
      id: 3,
      title: "Do you have any pictures or videos?",
      subtitle: "Add media to bring your memory to life"
    }
  ]

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setMemoryData(prev => ({
        ...prev,
        files: [...prev.files, ...newFiles]
      }))
    }
  }

  const removeFile = (index: number) => {
    setMemoryData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      const formData = new FormData()
      formData.append('title', memoryData.title)
      formData.append('textContent', memoryData.description)
      
      if (chapterId) {
        formData.append('timeZoneId', chapterId)
      }

      // Handle date based on type
      if (memoryData.dateType === 'exact' && memoryData.exactDate) {
        formData.append('customDate', new Date(memoryData.exactDate).toISOString())
        formData.append('datePrecision', 'exact')
      } else if (memoryData.dateType === 'estimated' && memoryData.estimatedDate) {
        formData.append('customDate', new Date(memoryData.estimatedDate).toISOString())
        formData.append('datePrecision', 'approximate')
      } else if (memoryData.dateType === 'within-chapter') {
        formData.append('approximateDate', 'within-chapter')
        formData.append('datePrecision', 'era')
      }

      // Add files
      memoryData.files.forEach((file) => {
        formData.append('media', file)
      })

      if (!user) {
        throw new Error('Please log in to create memories')
      }

      // Get custom JWT token for API
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
        }),
      })

      if (!tokenResponse.ok) {
        throw new Error('Authentication failed')
      }

      const { token } = await tokenResponse.json()

      const response = await fetch('/api/memories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        onComplete()
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('API Error:', errorData)
        throw new Error(errorData.error || 'Failed to create memory')
      }
    } catch (error) {
      console.error('Error creating memory:', error)
      alert('Failed to create memory. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getAuthToken = () => {
    const cookies = document.cookie.split(';')
    const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth-token='))
    return authCookie ? authCookie.split('=')[1] : ''
  }

  const handleVoiceRecord = () => {
    if (!isPremiumUser) {
      setShowPremiumNotification(true)
      return
    }
    
    setShowVoiceRecorder(true)
  }

  const handleVoiceTranscription = (transcribedText: string) => {
    setMemoryData(prev => ({
      ...prev,
      description: prev.description ? `${prev.description}\n\n${transcribedText}` : transcribedText
    }))
    setShowVoiceRecorder(false)
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return memoryData.title.trim().length > 0
      case 2:
        return (
          (memoryData.dateType === 'exact' && memoryData.exactDate) ||
          (memoryData.dateType === 'rough' && memoryData.roughDate) ||
          (memoryData.dateType === 'approximate' && memoryData.approximateDate) ||
          (memoryData.dateType === 'estimated' && memoryData.estimatedDate) ||
          (memoryData.dateType === 'within-chapter')
        )
      case 3:
        return true // Files are optional
      default:
        return false
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={onCancel}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X size={20} className="text-slate-500" />
            </button>
            <div className="text-sm font-medium text-slate-600">
              Step {currentStep} of {steps.length}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
            <div 
              className="bg-slate-800 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>


          {/* Chapter Context */}
          {chapterTitle && (
            <div className="bg-slate-50 rounded-xl p-3 mb-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Adding to chapter</div>
              <div className="text-sm font-medium text-slate-900">{chapterTitle}</div>
            </div>
          )}

          {/* Step Title */}
          <div>
            <h2 className="text-xl font-bold text-slate-900">{steps[currentStep - 1].title}</h2>
            <p className="text-slate-600 text-sm">{steps[currentStep - 1].subtitle}</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto">
          {/* Step 1: What do you remember? */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 mb-2">
                  Give this memory a title
                </label>
                <input
                  type="text"
                  placeholder="e.g., First day at university"
                  value={memoryData.title}
                  onChange={(e) => setMemoryData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent"
                  autoFocus
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-900">
                    Describe what happened
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
                    placeholder="Tell the story of this memory... What happened? How did you feel? Who was there?"
                    value={memoryData.description}
                    onChange={(e) => setMemoryData(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent resize-none transition-all border-slate-300 focus:ring-slate-800 ${isPremiumUser ? 'pr-16' : ''}`}
                  />
                  
                  
                  {/* Premium Voice Button - Positioned on textarea */}
                  {isPremiumUser && (
                    <div className="absolute bottom-3 right-3">
                      <button
                        type="button"
                        onClick={handleVoiceRecord}
                        className="p-2.5 rounded-full transition-all duration-200 shadow-lg bg-slate-700 hover:bg-slate-800 text-white hover:shadow-xl border-2 border-slate-600 hover:border-slate-500"
                        title="Start voice transcription (Premium)"
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
          )}

          {/* Step 2: When did this happen? */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="grid gap-3">
                {/* Exact Date */}
                <label className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  memoryData.dateType === 'exact' 
                    ? 'border-slate-800 bg-slate-50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="dateType"
                      value="exact"
                      checked={memoryData.dateType === 'exact'}
                      onChange={(e) => setMemoryData(prev => ({ ...prev, dateType: 'exact' as const }))}
                      className="w-4 h-4 text-slate-800"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">I know the exact date</div>
                      <div className="text-sm text-slate-600">Pick the specific day this happened</div>
                    </div>
                    <Calendar size={20} className="text-slate-400" />
                  </div>
                  {memoryData.dateType === 'exact' && (
                    <div className="mt-3 pl-7">
                      <input
                        type="date"
                        value={memoryData.exactDate || ''}
                        onChange={(e) => setMemoryData(prev => ({ ...prev, exactDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800"
                      />
                    </div>
                  )}
                </label>

                {/* Rough Date */}
                <label className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  memoryData.dateType === 'rough' 
                    ? 'border-slate-800 bg-slate-50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="dateType"
                      value="rough"
                      checked={memoryData.dateType === 'rough'}
                      onChange={(e) => setMemoryData(prev => ({ ...prev, dateType: 'rough' as const }))}
                      className="w-4 h-4 text-slate-800"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">I know roughly when</div>
                      <div className="text-sm text-slate-600">Pick a month and year</div>
                    </div>
                    <Clock size={20} className="text-slate-400" />
                  </div>
                  {memoryData.dateType === 'rough' && (
                    <div className="mt-3 pl-7">
                      <input
                        type="month"
                        value={memoryData.roughDate || ''}
                        onChange={(e) => setMemoryData(prev => ({ ...prev, roughDate: e.target.value + '-01' }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800"
                      />
                    </div>
                  )}
                </label>

                {/* Approximate */}
                <label className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                  memoryData.dateType === 'within-chapter' 
                    ? 'border-slate-800 bg-slate-50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      name="dateType"
                      value="within-chapter"
                      checked={memoryData.dateType === 'within-chapter'}
                      onChange={(e) => setMemoryData(prev => ({ ...prev, dateType: 'within-chapter' as const }))}
                      className="w-4 h-4 text-slate-800"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">Somewhere within this chapter</div>
                      <div className="text-sm text-slate-600">Not exactly sure when, but it happened during this period</div>
                    </div>
                  </div>
                  {memoryData.dateType === 'within-chapter' && (
                    <div className="mt-3 pl-7">
                      <input
                        type="text"
                        placeholder={chapterTitle ? `e.g., Early in ${chapterTitle}, Near the end of this period, Midway through` : "e.g., Early in this chapter, Near the end, Midway through"}
                        value={memoryData.approximateDate || ''}
                        onChange={(e) => setMemoryData(prev => ({ ...prev, approximateDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800"
                      />
                    </div>
                  )}
                </label>
              </div>
            </div>
          )}

          {/* Step 3: Photos and Videos */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {/* Upload Area */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-slate-400 transition-colors">
                <Upload size={32} className="text-slate-400 mx-auto mb-3" />
                <div className="text-sm font-medium text-slate-900 mb-1">
                  Drop files here or click to browse
                </div>
                <div className="text-xs text-slate-500 mb-4">
                  Photos, videos, or audio files
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="inline-flex items-center px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors cursor-pointer"
                >
                  Choose Files
                </label>
              </div>

              {/* File List */}
              {memoryData.files.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-900">
                    {memoryData.files.length} file{memoryData.files.length !== 1 ? 's' : ''} selected
                  </div>
                  {memoryData.files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center">
                          {file.type.startsWith('image/') ? '🖼️' : 
                           file.type.startsWith('video/') ? '🎥' : '🎵'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900 truncate">
                            {file.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {(file.size / 1024 / 1024).toFixed(1)} MB
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {file.type.startsWith('image/') && (
                          <button
                            onClick={() => {
                              setTempImageForCrop({ file, index })
                              const reader = new FileReader()
                              reader.onload = (e) => {
                                setShowImageCropper(true)
                              }
                              reader.readAsDataURL(file)
                            }}
                            className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                            title="Crop image"
                          >
                            <Crop size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => removeFile(index)}
                          className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          <X size={16} className="text-slate-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="text-xs text-slate-500 text-center">
                You can always add more photos and videos later
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="flex items-center space-x-2 px-4 py-2 text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          {currentStep < steps.length ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center space-x-2 px-6 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span>Continue</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className="flex items-center space-x-2 px-6 py-2 bg-sky-600 text-white rounded-xl hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check size={16} />
              )}
              <span>{isSubmitting ? 'Creating...' : 'Create Memory'}</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Voice Recorder Modal */}
      {showVoiceRecorder && (
        <VoiceRecorder
          onTranscription={handleVoiceTranscription}
          onClose={() => setShowVoiceRecorder(false)}
          isPremium={isPremiumUser}
        />
      )}
      
      {/* Image Cropper Modal */}
      {showImageCropper && tempImageForCrop && (
        <ImageCropper
          imageUrl={URL.createObjectURL(tempImageForCrop.file)}
          onCropComplete={(croppedFile) => {
            if (croppedFile) {
              // Replace the original file with the cropped version
              setMemoryData(prev => ({
                ...prev,
                files: prev.files.map((f, i) => 
                  i === tempImageForCrop.index ? croppedFile : f
                )
              }))
            }
            setShowImageCropper(false)
            setTempImageForCrop(null)
          }}
          onCancel={() => {
            setShowImageCropper(false)
            setTempImageForCrop(null)
          }}
          title="Crop your memory photo"
          aspectRatio={16 / 9} // Common photo aspect ratio
          outputWidth={1920}
          outputHeight={1080}
        />
      )}

      {/* Premium Feature Notification */}
      <NotificationModal
        isOpen={showPremiumNotification}
        type="premium"
        title="Premium Feature"
        message="🎤 Voice transcription is a premium feature! Upgrade to Pro to unlock AI-powered voice-to-text for your memories."
        actionText="Upgrade to Pro"
        onAction={() => {
          // TODO: Navigate to upgrade page
          console.log('Navigate to upgrade page')
        }}
        onClose={() => setShowPremiumNotification(false)}
        autoClose={false}
      />
    </div>
  )
} 