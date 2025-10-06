'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, ArrowRight, Calendar, Clock, Upload, X, Check, Mic, Crown, Sparkles, Crop, Tag } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import VoiceRecorder from '@/components/VoiceRecorder'
import ImageCropper from '@/components/ImageCropper'
import UpgradeModal from './UpgradeModal'
import SystemMessageModal from './SystemMessageModal'
import TaggingInput from './TaggingInput'
import MayaEnrichmentModal from './MayaEnrichmentModal'
import toast from 'react-hot-toast'
import PhotoTagger from './PhotoTagger'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import '@/styles/datepicker.css'

interface AddMemoryWizardProps {
  chapterId: string | null
  chapterTitle?: string
  onComplete: () => void
  onCancel: () => void
}

interface MemoryData {
  title: string
  description: string
  dateType: 'exact' | 'rough' | 'approximate' | 'estimated' | 'within-chapter' | 'age-based'
  exactDate?: Date | null
  roughDate?: Date | null
  approximateDate?: string
  estimatedDate?: Date | null
  ageBasedYear?: string
  files: File[]
}

export default function AddMemoryWizard({ chapterId, chapterTitle, onComplete, onCancel }: AddMemoryWizardProps) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [memoryData, setMemoryData] = useState<MemoryData>({
    title: '',
    description: '',
    dateType: chapterId ? 'within-chapter' : 'rough',
    files: []
  })
  const [taggedPeople, setTaggedPeople] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPremiumUser, setIsPremiumUser] = useState(false)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [premiumLoading, setPremiumLoading] = useState(true)
  const [showImageCropper, setShowImageCropper] = useState(false)
  const [tempImageForCrop, setTempImageForCrop] = useState<{ file: File, index: number } | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeFeature, setUpgradeFeature] = useState<'voice-transcription' | 'ai-image-generation' | 'age-dating' | 'general'>('general')
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showPhotoTagger, setShowPhotoTagger] = useState(false)
  const [selectedImageForTagging, setSelectedImageForTagging] = useState<{
    url: string
    fileIndex: number
  } | null>(null)
  const [showAiImageGenerator, setShowAiImageGenerator] = useState(false)
  const [aiImagePrompt, setAiImagePrompt] = useState('')
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [showMayaEnrichment, setShowMayaEnrichment] = useState(false)
  const [mayaEnrichmentData, setMayaEnrichmentData] = useState<any>(null)
  const [liveEnrichment, setLiveEnrichment] = useState<any>(null)
  const [isLiveEnriching, setIsLiveEnriching] = useState(false)
  const [enrichmentDebounceTimer, setEnrichmentDebounceTimer] = useState<NodeJS.Timeout | null>(null)

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
        console.log('📡 MEMORY WIZARD: Getting auth token for premium status check...')
        const tokenResponse = await fetch('/api/auth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, email: user.email }),
        })

        if (!tokenResponse.ok) {
          console.error('❌ MEMORY WIZARD: Failed to get auth token for premium check')
          throw new Error('Failed to get auth token')
        }

        const { token } = await tokenResponse.json()
        console.log('✅ MEMORY WIZARD: Got auth token for premium check')

        console.log('📡 MEMORY WIZARD: Calling /api/user/premium-status with JWT token...')
        const response = await fetch('/api/user/premium-status', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        })

        console.log('📊 MEMORY WIZARD: Premium status response:', response.status, response.ok)

        if (response.ok) {
          const data = await response.json()
          console.log('📊 MEMORY WIZARD: Premium status data:', data)
          setIsPremiumUser(data.isPremium)
          console.log('🔄 MEMORY WIZARD: Premium status updated:', data.isPremium)
        } else {
          console.error('❌ MEMORY WIZARD: Premium status check failed:', response.status)
        }
      } catch (error) {
        console.error('❌ MEMORY WIZARD: Error checking premium status:', error)
      } finally {
        setPremiumLoading(false)
        console.log('✅ MEMORY WIZARD: Premium status check completed')
      }
    }
    
    checkPremiumStatus()
  }, [user])

  const steps = [
    {
      id: 1,
      title: chapterTitle 
        ? `Adding memory to "${chapterTitle}"`
        : "Adding a new memory",
      subtitle: "Tell us about this memory"
    },
    {
      id: 2,
      title: chapterTitle 
        ? "When in this chapter did it happen?"
        : "When did this happen?",
      subtitle: chapterTitle 
        ? "Help us place it within your chapter timeline"
        : "Help us place it on your timeline"
    },
    {
      id: 3,
      title: "Do you have any pictures or videos?",
      subtitle: "Add media to bring your memory to life"
    }
  ]

  const handleNext = () => {
    // Live enrichment happens automatically as user types, no modal needed
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleMayaEnrichmentComplete = (enrichedData: any) => {
    setMayaEnrichmentData(enrichedData)
    setShowMayaEnrichment(false)
    setCurrentStep(currentStep + 1)
  }

  const handleContinueWithoutMaya = () => {
    setShowMayaEnrichment(false)
    setCurrentStep(currentStep + 1)
  }

  // Real-time enrichment as user types
  const fetchLiveEnrichment = async (title: string, description: string) => {
    if (!isPremiumUser || !user) return
    if (!title.trim() || description.length < 50) return // Only trigger if substantial content
    
    setIsLiveEnriching(true)
    try {
      const response = await fetch('/api/maya/suggest-memory-enrichment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          memory_title: title,
          memory_description: description
        })
      })
      
      const data = await response.json()
      console.log('🎯 LIVE ENRICHMENT:', data)
      
      if (data.success && data.data?.enrichment) {
        setLiveEnrichment(data.data.enrichment)
      }
    } catch (error) {
      console.error('Live enrichment error:', error)
    } finally {
      setIsLiveEnriching(false)
    }
  }

  // Debounced enrichment trigger
  const handleDescriptionChange = (value: string) => {
    setMemoryData(prev => ({ ...prev, description: value }))
    
    // Clear existing timer
    if (enrichmentDebounceTimer) {
      clearTimeout(enrichmentDebounceTimer)
    }
    
    // Set new timer for 2 seconds after user stops typing
    if (isPremiumUser && memoryData.title) {
      const timer = setTimeout(() => {
        fetchLiveEnrichment(memoryData.title, value)
      }, 2000)
      setEnrichmentDebounceTimer(timer)
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

  const handleGenerateAiImage = async () => {
    if (!aiImagePrompt.trim()) {
      toast.error('Please describe what you want to see')
      return
    }

    if (!isPremiumUser) {
      setUpgradeFeature('ai-image-generation')
      setShowUpgradeModal(true)
      return
    }

    setIsGeneratingImage(true)
    try {
      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({
          prompt: aiImagePrompt,
          memoryTitle: memoryData.title,
          memoryDescription: memoryData.description
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate image')
      }

      const data = await response.json()
      
      // Convert base64 to blob
      const base64Response = await fetch(data.imageUrl)
      const blob = await base64Response.blob()
      
      // Create file from blob
      const file = new File([blob], `ai-generated-${Date.now()}.png`, { type: 'image/png' })
      
      // Add to files
      setMemoryData(prev => ({
        ...prev,
        files: [...prev.files, file]
      }))
      
      setShowAiImageGenerator(false)
      setAiImagePrompt('')
      toast.success('AI image generated successfully! 🎨')
    } catch (error) {
      console.error('Error generating AI image:', error)
      toast.error('Failed to generate image. Please try again.')
    } finally {
      setIsGeneratingImage(false)
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
      formData.append('taggedPeople', JSON.stringify(taggedPeople))
      
      if (chapterId) {
        formData.append('timeZoneId', chapterId)
      }

      // Handle date based on type
      if (memoryData.dateType === 'exact' && memoryData.exactDate) {
        formData.append('customDate', memoryData.exactDate.toISOString())
        formData.append('datePrecision', 'exact')
      } else if (memoryData.dateType === 'rough' && memoryData.roughDate) {
        formData.append('customDate', memoryData.roughDate.toISOString())
        formData.append('datePrecision', 'approximate')
      } else if (memoryData.dateType === 'estimated' && memoryData.estimatedDate) {
        formData.append('customDate', memoryData.estimatedDate.toISOString())
        formData.append('datePrecision', 'approximate')
      } else if (memoryData.dateType === 'within-chapter') {
        formData.append('approximateDate', memoryData.approximateDate || 'within-chapter')
        formData.append('datePrecision', 'era')
      } else if (memoryData.dateType === 'age-based' && memoryData.ageBasedYear) {
        formData.append('approximateDate', `Around age ${memoryData.ageBasedYear}`)
        formData.append('datePrecision', 'approximate')
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
      setErrorMessage('Failed to create memory. Please try again.')
      setShowErrorModal(true)
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
      setUpgradeFeature('voice-transcription')
      setShowUpgradeModal(true)
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
          (memoryData.dateType === 'within-chapter') ||
          (memoryData.dateType === 'age-based' && memoryData.ageBasedYear)
        )
      case 3:
        return true // Files are optional
      default:
        return false
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex-shrink-0">
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
          {chapterTitle ? (
            <div className="bg-slate-50 rounded-xl p-3 mb-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Adding to chapter</div>
              <div className="text-sm font-medium text-slate-900">{chapterTitle}</div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">📁 Standalone Memory</div>
              <div className="text-sm text-amber-800 mt-1">
                This memory will be saved to your "Memories to Organize" collection. You can move it to a chapter later!
              </div>
            </div>
          )}

          {/* Step Title */}
          <div>
            <h2 className="text-xl font-bold text-slate-900">{steps[currentStep - 1].title}</h2>
            <p className="text-slate-600 text-sm">{steps[currentStep - 1].subtitle}</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto flex-1 min-h-0">
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
                  <TaggingInput
                    value={memoryData.description}
                    onChange={(value) => handleDescriptionChange(value)}
                    onTaggedPeopleChange={setTaggedPeople}
                    placeholder="Tell the story of this memory... What happened? How did you feel? Who was there? Use @ to tag people!"
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:border-transparent resize-none transition-all border-slate-300 focus:ring-slate-800 ${isPremiumUser ? 'pr-16' : ''}`}
                  />
                  {isLiveEnriching && (
                    <div className="absolute top-2 right-2 flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" />
                      Maya is thinking...
                    </div>
                  )}
                  
                  {/* Tagged People Display */}
                  {taggedPeople.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-sm text-gray-600">Tagged:</span>
                      {taggedPeople.map((person, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          @{person}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  
                  {/* Premium Voice Button - Positioned on textarea */}
                  {isPremiumUser && (
                    <div className="absolute bottom-3 right-3">
                      <button
                        type="button"
                        onClick={handleVoiceRecord}
                        className="p-2.5 rounded-full transition-all duration-200 shadow-lg bg-slate-700 hover:bg-slate-800 text-white hover:shadow-xl border-2 border-slate-600 hover:border-slate-500"
                        title="Voice-to-Text Transcription (Premium Feature - Upgrade Required)"
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
                
                {/* Live Enrichment Suggestions */}
                {liveEnrichment && !isLiveEnriching && isPremiumUser && (
                  <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-purple-900 mb-1">Maya's Suggestions</h4>
                        <p className="text-sm text-purple-700">Consider adding these details to enrich your memory:</p>
                      </div>
                    </div>
                    
                    {liveEnrichment.questions && liveEnrichment.questions.length > 0 && (
                      <div className="space-y-2">
                        {liveEnrichment.questions.slice(0, 3).map((question: string, index: number) => (
                          <div key={index} className="flex items-start gap-2 p-3 bg-white rounded-lg border border-purple-200 hover:border-purple-300 transition-colors">
                            <span className="text-purple-600 font-bold text-lg leading-none">•</span>
                            <p className="text-sm text-slate-700 flex-1">{question}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {liveEnrichment.chapter_recommendation && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-800">
                          <strong>💡 Chapter Suggestion:</strong> {typeof liveEnrichment.chapter_recommendation === 'string' 
                            ? liveEnrichment.chapter_recommendation 
                            : liveEnrichment.chapter_recommendation.title}
                        </p>
                      </div>
                    )}
                    
                    {liveEnrichment.additional_context && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-sm text-green-800">
                          <strong>ℹ️ Context:</strong> {liveEnrichment.additional_context}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {isPremiumUser && !liveEnrichment && !isLiveEnriching && (
                  <div className="mt-2 text-xs text-slate-500 flex items-center space-x-1">
                    <Sparkles size={12} className="text-purple-600" />
                    <span>Maya will suggest enrichment questions as you type (2s after you stop)</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: When did this happen? */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900 mb-1">Choose how specific you want to be</h3>
                    <p className="text-sm text-blue-700">
                      The more specific you can be, the better we can organize your memory on your timeline.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid gap-4">
                {/* Exact Date */}
                <label className={`p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  memoryData.dateType === 'exact' 
                    ? 'border-slate-800 bg-slate-50 shadow-sm' 
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}>
                  <div className="flex items-center space-x-4">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      memoryData.dateType === 'exact'
                        ? 'border-slate-800 bg-slate-800'
                        : 'border-slate-300 hover:border-slate-400'
                    }`}>
                      {memoryData.dateType === 'exact' && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <input
                      type="radio"
                      name="dateType"
                      value="exact"
                      checked={memoryData.dateType === 'exact'}
                      onChange={(e) => setMemoryData(prev => ({ ...prev, dateType: 'exact' as const }))}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">I know the exact date</div>
                      <div className="text-sm text-slate-600">Pick the specific day this happened</div>
                    </div>
                    <Calendar size={20} className="text-slate-400" />
                  </div>
                  {memoryData.dateType === 'exact' && (
                    <div className="mt-4 pl-7">
                      <div className="bg-white border border-slate-300 rounded-lg shadow-sm">
                        <DatePicker
                          selected={memoryData.exactDate}
                          onChange={(date) => setMemoryData(prev => ({ ...prev, exactDate: date }))}
                          dateFormat="MMMM d, yyyy"
                          showPopperArrow={false}
                          placeholderText="Select the exact date"
                          className="w-full px-4 py-3 text-slate-900 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800"
                          wrapperClassName="w-full"
                          calendarClassName="shadow-lg border border-slate-200 rounded-lg"
                          showMonthDropdown
                          showYearDropdown
                          dropdownMode="select"
                          yearDropdownItemNumber={100}
                          scrollableYearDropdown
                          maxDate={new Date()}
                          popperPlacement="bottom-start"
                          dayClassName={(date) => {
                            const today = new Date()
                            const isToday = date.toDateString() === today.toDateString()
                            return isToday ? 'bg-slate-800 text-white rounded-full' : 'hover:bg-slate-100 rounded-full'
                          }}
                        />
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        💡 Tip: Use the year dropdown to quickly jump to any year
                      </div>
                    </div>
                  )}
                </label>

                {/* Rough Date */}
                <label className={`p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  memoryData.dateType === 'rough' 
                    ? 'border-slate-800 bg-slate-50 shadow-sm' 
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}>
                  <div className="flex items-center space-x-4">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      memoryData.dateType === 'rough'
                        ? 'border-slate-800 bg-slate-800'
                        : 'border-slate-300 hover:border-slate-400'
                    }`}>
                      {memoryData.dateType === 'rough' && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <input
                      type="radio"
                      name="dateType"
                      value="rough"
                      checked={memoryData.dateType === 'rough'}
                      onChange={(e) => setMemoryData(prev => ({ ...prev, dateType: 'rough' as const }))}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900">I know roughly when</div>
                      <div className="text-sm text-slate-600">Pick a month and year</div>
                    </div>
                    <Clock size={20} className="text-slate-400" />
                  </div>
                  {memoryData.dateType === 'rough' && (
                    <div className="mt-4 pl-7">
                      <div className="bg-white border border-slate-300 rounded-lg shadow-sm">
                        <DatePicker
                          selected={memoryData.roughDate}
                          onChange={(date) => setMemoryData(prev => ({ ...prev, roughDate: date }))}
                          dateFormat="MMMM yyyy"
                          showMonthYearPicker
                          showFullMonthYearPicker
                          placeholderText="Select month and year"
                          className="w-full px-4 py-3 text-slate-900 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800"
                          wrapperClassName="w-full"
                          calendarClassName="shadow-lg border border-slate-200 rounded-lg"
                          showYearDropdown
                          scrollableYearDropdown
                          yearDropdownItemNumber={100}
                          maxDate={new Date()}
                          popperPlacement="bottom-start"
                        />
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        💡 Tip: Scroll through the years or type to search
                      </div>
                    </div>
                  )}
                </label>

                {/* Age-based (Premium Only) */}
                <label className={`p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  memoryData.dateType === 'age-based' 
                    ? 'border-purple-500 bg-purple-50 shadow-sm' 
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                } ${!isPremiumUser && 'opacity-75'}`}
                onClick={(e) => {
                  if (!isPremiumUser) {
                    e.preventDefault()
                    setUpgradeFeature('age-dating')
                    setShowUpgradeModal(true)
                  }
                }}>
                  <div className="flex items-center space-x-4">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      memoryData.dateType === 'age-based'
                        ? 'border-purple-600 bg-purple-600'
                        : 'border-slate-300 hover:border-slate-400'
                    }`}>
                      {memoryData.dateType === 'age-based' && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                    <input
                      type="radio"
                      name="dateType"
                      value="age-based"
                      checked={memoryData.dateType === 'age-based'}
                      onChange={(e) => setMemoryData(prev => ({ ...prev, dateType: 'age-based' as const }))}
                      className="sr-only"
                      disabled={!isPremiumUser}
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        I was about X years old
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold rounded-full">
                          <Sparkles size={10} />
                          AI Pro
                        </span>
                      </div>
                      <div className="text-sm text-slate-600">AI will work to slot this into your timeline based on your age and birth year</div>
                    </div>
                  </div>
                  {memoryData.dateType === 'age-based' && isPremiumUser && (
                    <div className="mt-4 pl-7">
                      <div className="bg-white border border-slate-300 rounded-lg shadow-sm">
                        <input
                          type="number"
                          min="0"
                          max="150"
                          placeholder="e.g., 25"
                          value={memoryData.ageBasedYear || ''}
                          onChange={(e) => setMemoryData(prev => ({ ...prev, ageBasedYear: e.target.value }))}
                          className="w-full px-4 py-3 text-slate-900 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-slate-400"
                        />
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        💡 AI will calculate the approximate year based on your birth year
                      </div>
                    </div>
                  )}
                </label>

                {/* Approximate - Only show when in a chapter */}
                {chapterId && (
                  <label className={`p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                    memoryData.dateType === 'within-chapter' 
                      ? 'border-slate-800 bg-slate-50 shadow-sm' 
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}>
                    <div className="flex items-center space-x-4">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        memoryData.dateType === 'within-chapter'
                          ? 'border-slate-800 bg-slate-800'
                          : 'border-slate-300 hover:border-slate-400'
                      }`}>
                        {memoryData.dateType === 'within-chapter' && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      <input
                        type="radio"
                        name="dateType"
                        value="within-chapter"
                        checked={memoryData.dateType === 'within-chapter'}
                        onChange={(e) => setMemoryData(prev => ({ ...prev, dateType: 'within-chapter' as const }))}
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">Somewhere within {chapterTitle || 'this chapter'}</div>
                        <div className="text-sm text-slate-600">Not exactly sure when, but it happened during this period</div>
                      </div>
                    </div>
                    {memoryData.dateType === 'within-chapter' && (
                      <div className="mt-4 pl-7">
                        <div className="bg-white border border-slate-300 rounded-lg shadow-sm">
                          <input
                            type="text"
                            placeholder={chapterTitle ? `e.g., Early in ${chapterTitle}, Near the end, Midway through` : "e.g., Early in this chapter, Near the end, Midway through"}
                            value={memoryData.approximateDate || ''}
                            onChange={(e) => setMemoryData(prev => ({ ...prev, approximateDate: e.target.value }))}
                            className="w-full px-4 py-3 text-slate-900 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-800 placeholder:text-slate-400"
                          />
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          💡 Tip: Be as specific as you can remember - "Early 2023", "Summer months", "Around Christmas"
                        </div>
                      </div>
                    )}
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Photos and Videos */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* AI Image Generator Option */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                      <Sparkles size={20} className="text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                        Generate AI Image
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold rounded-full">
                          <Sparkles size={10} />
                          AI Pro
                        </span>
                      </h4>
                      <p className="text-sm text-slate-600 mt-0.5">
                        Create unique images for your memories. As you upload photos of people in your network, the AI gets better at matching generated images to them, almost recreating your memories.
                      </p>
                    </div>
                  </div>
                </div>

                {showAiImageGenerator ? (
                  <div className="space-y-3">
                    <div>
                      <textarea
                        value={aiImagePrompt}
                        onChange={(e) => setAiImagePrompt(e.target.value)}
                        placeholder={`Describe the scene for AI to generate...\n\n(The memory title and description will be automatically included: "${memoryData.title || 'Your memory title'}" - "${memoryData.description || 'Your memory description'}")`}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                        rows={3}
                        disabled={isGeneratingImage}
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        💡 Tip: Be descriptive - mention setting, lighting, mood, and any specific details
                      </p>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={handleGenerateAiImage}
                        disabled={isGeneratingImage || !aiImagePrompt.trim()}
                        className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
                      >
                        <Sparkles size={16} />
                        <span>{isGeneratingImage ? 'Generating...' : 'Generate Image'}</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowAiImageGenerator(false)
                          setAiImagePrompt('')
                        }}
                        disabled={isGeneratingImage}
                        className="px-6 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                      onClick={() => {
                      if (!isPremiumUser) {
                        setUpgradeFeature('ai-image-generation')
                        setShowUpgradeModal(true)
                      } else {
                        setShowAiImageGenerator(true)
                      }
                    }}
                    className="w-full px-4 py-3 bg-white border-2 border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <Sparkles size={18} />
                    <span>Describe memory to generate image</span>
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-slate-500 font-medium">or upload your own</span>
                </div>
              </div>

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
                          <>
                            <button
                              onClick={() => {
                                setSelectedImageForTagging({
                                  url: URL.createObjectURL(file),
                                  fileIndex: index
                                })
                                setShowPhotoTagger(true)
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Tag people in this photo"
                            >
                              <Tag size={16} />
                            </button>
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
                          </>
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
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
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

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature={upgradeFeature}
      />

      {/* Error Modal */}
      <SystemMessageModal
        isOpen={showErrorModal}
        type="error"
        title="Error Creating Memory"
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
      />

      {/* Maya Enrichment Modal */}
      <MayaEnrichmentModal
        isOpen={showMayaEnrichment}
        onClose={() => setShowMayaEnrichment(false)}
        onContinueWithoutMaya={handleContinueWithoutMaya}
        memoryTitle={memoryData.title}
        memoryDescription={memoryData.description}
        isPremiumUser={isPremiumUser}
        onEnrichmentComplete={handleMayaEnrichmentComplete}
      />

      {/* Photo Tagger Modal */}
      {showPhotoTagger && selectedImageForTagging && (
        <PhotoTagger
          imageUrl={selectedImageForTagging.url}
          mediaId="new-upload" // Will be handled after memory creation
          memoryId="" // Will be set after memory creation
          existingTags={[]}
          onSave={(tags) => {
            console.log('Photo tags saved for new memory:', tags)
            setShowPhotoTagger(false)
            setSelectedImageForTagging(null)
            // TODO: Store tags temporarily until memory is created
          }}
          onClose={() => {
            setShowPhotoTagger(false)
            setSelectedImageForTagging(null)
          }}
        />
      )}
    </div>
  )
} 