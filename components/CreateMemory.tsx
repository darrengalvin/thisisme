'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, MapPin, Upload, X, Image, Film, Mic, Plus } from 'lucide-react'

interface Memory {
  id: string
  title: string
  content: string
  memoryDate: string
  datePrecision?: 'exact' | 'approximate' | 'era'
  approximateDate?: string
  userId: string
  timeZoneId?: string
  createdAt: string
}

interface TimeZone {
  id: string
  title: string
  type: 'PERSONAL' | 'GROUP'
  startDate?: string
  endDate?: string
  location?: string
}

interface CreateMemoryProps {
  onMemoryCreated?: (memory: Memory) => void
}

export default function CreateMemory({ onMemoryCreated }: CreateMemoryProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [memoryDate, setMemoryDate] = useState('')
  const [memoryTime, setMemoryTime] = useState('')
  const [datePrecision, setDatePrecision] = useState<'exact' | 'approximate' | 'era'>('exact')
  const [approximateDate, setApproximateDate] = useState('')
  const [approximateYear, setApproximateYear] = useState('')
  const [approximateSeason, setApproximateSeason] = useState('')
  const [selectedTimeZone, setSelectedTimeZone] = useState('')
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [timeZones, setTimeZones] = useState<TimeZone[]>([])
  const [isLoadingTimeZones, setIsLoadingTimeZones] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  
  // New Group Creation States
  const [newGroupTitle, setNewGroupTitle] = useState('')
  const [newGroupStartDate, setNewGroupStartDate] = useState('')
  const [newGroupEndDate, setNewGroupEndDate] = useState('')
  const [newGroupLocation, setNewGroupLocation] = useState('')
  const [newGroupType, setNewGroupType] = useState<'PERSONAL' | 'GROUP'>('GROUP')
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [groupDatePrecision, setGroupDatePrecision] = useState<'exact' | 'estimated'>('estimated')
  const [groupStartYear, setGroupStartYear] = useState('')
  const [groupEndYear, setGroupEndYear] = useState('')
  const [newGroupDescription, setNewGroupDescription] = useState('')
  const [newGroupImage, setNewGroupImage] = useState<File | null>(null)

  useEffect(() => {
    const fetchTimeZones = async () => {
      try {
        const token = getAuthToken()
        if (!token) {
          console.error('No auth token found for timezone fetch')
          return
        }

        const response = await fetch('/api/timezones', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setTimeZones(data.data || data) // Handle both possible response formats
        } else {
          console.error('Failed to fetch timezones:', response.status)
        }
      } catch (error) {
        console.error('Error fetching time zones:', error)
      } finally {
        setIsLoadingTimeZones(false)
      }
    }

    fetchTimeZones()
  }, [])

  const getAuthToken = () => {
    // First try to get from cookies (consistent with other components)
    const cookies = document.cookie.split(';')
    const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth-token='))
    if (authCookie) {
      return authCookie.split('=')[1]
    }
    
    // Fallback to localStorage for backward compatibility
    const localToken = localStorage.getItem('token')
    if (localToken) {
      return localToken
    }
    
    return null
  }

  const handleCreateGroup = async () => {
    if (!newGroupTitle.trim()) return

    setIsCreatingGroup(true)
    try {
      const token = getAuthToken()
      if (!token) return

      // Prepare dates based on precision
      let startDate: string | undefined
      let endDate: string | undefined

      if (groupDatePrecision === 'estimated') {
        if (groupStartYear) {
          startDate = `${groupStartYear}-01-01`
        }
        if (groupEndYear && groupEndYear !== 'ongoing') {
          endDate = `${groupEndYear}-12-31`
        }
      } else {
        startDate = newGroupStartDate || undefined
        endDate = newGroupEndDate || undefined
      }

      const response = await fetch('/api/timezones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newGroupTitle,
          type: newGroupType,
          startDate,
          endDate,
          location: newGroupLocation || undefined,
          description: newGroupDescription || undefined,
        }),
      })

      if (response.ok) {
        const newGroup = await response.json()
        setTimeZones(prev => [...prev, newGroup])
        setSelectedTimeZone(newGroup.id)
        setShowCreateGroup(false)
        // Reset form
        setNewGroupTitle('')
        setNewGroupStartDate('')
        setNewGroupEndDate('')
        setNewGroupLocation('')
        setNewGroupType('GROUP')
        setGroupDatePrecision('estimated')
        setGroupStartYear('')
        setGroupEndYear('')
        setNewGroupDescription('')
        setNewGroupImage(null)
      }
    } catch (error) {
      console.error('Error creating group:', error)
    } finally {
      setIsCreatingGroup(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setMediaFiles(prev => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const token = getAuthToken()
      if (!token) {
        console.error('No auth token found')
        return
      }

      const formData = new FormData()
      formData.append('title', title)
      formData.append('textContent', content)  // Changed from 'content' to 'textContent'
      
      if (datePrecision === 'exact' && memoryDate) {
        const dateTime = memoryTime ? `${memoryDate}T${memoryTime}` : `${memoryDate}T12:00`
        const dateObj = new Date(dateTime)
        if (isNaN(dateObj.getTime())) {
          alert('Invalid date selected. Please check your date and time.')
          return
        }
        formData.append('customDate', dateObj.toISOString())  // Changed from 'memoryDate' to 'customDate'
      } else if (datePrecision === 'approximate') {
        formData.append('approximateDate', approximateDate || `${approximateSeason} ${approximateYear}`.trim())
        if (approximateYear) {
          const yearNum = parseInt(approximateYear)
          if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
            alert('Invalid year. Please enter a year between 1900 and 2100.')
            return
          }
          const dateObj = new Date(`${yearNum}-06-15`)
          if (isNaN(dateObj.getTime())) {
            alert('Invalid year selected.')
            return
          }
          formData.append('customDate', dateObj.toISOString())  // Changed from 'memoryDate' to 'customDate'
        }
      } else if (datePrecision === 'era' && selectedTimeZone) {
        const timeZone = timeZones.find(tz => tz.id === selectedTimeZone)
        if (timeZone?.startDate) {
          formData.append('customDate', timeZone.startDate)  // Changed from 'memoryDate' to 'customDate'
          formData.append('approximateDate', `During ${timeZone.title}`)
        }
      }
      
      formData.append('datePrecision', datePrecision)
      if (selectedTimeZone) {
        formData.append('timeZoneId', selectedTimeZone)
      }

      mediaFiles.forEach((file) => {
        formData.append('media', file)
      })

      const response = await fetch('/api/memories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        if (onMemoryCreated) {
          onMemoryCreated(result.data)
        }
        
        // Reset form
        setTitle('')
        setContent('')
        setMemoryDate('')
        setMemoryTime('')
        setApproximateDate('')
        setApproximateYear('')
        setApproximateSeason('')
        setSelectedTimeZone('')
        setMediaFiles([])
        setDatePrecision('exact')
      } else {
        const errorData = await response.json()
        console.error('Error creating memory:', errorData)
        alert('Failed to create memory: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error creating memory:', error)
      alert('Failed to create memory. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8 pb-32">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create New Memory</h1>
          <p className="text-gray-600">Capture and share your life moments</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          


          {/* Main Content - Responsive Layout */}
          <div className="grid lg:grid-cols-2 gap-6">
            
            {/* Left Column - Memory Content */}
            <div className="space-y-6">
              
              {/* Title & Content */}
              <div className="card p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Memory Details</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Give your memory a title..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Tell your story..."
                      rows={5}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Media Upload */}
              <div className="card p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Upload size={20} className="text-primary-600" />
                  <span>Add Media</span>
                </h2>
                
                <div className="space-y-4">
                                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colours">
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*,audio/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="media-upload"
                    />
                    <label htmlFor="media-upload" className="cursor-pointer">
                      <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-600 text-sm mb-1">Drop files here or click to upload</p>
                      <p className="text-xs text-gray-500">Photos, videos, or audio files</p>
                    </label>
                  </div>
                  
                  {/* Media Preview */}
                  {mediaFiles.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {mediaFiles.map((file, index) => (
                        <div key={index} className="relative bg-gray-100 rounded-lg p-2">
                          <div className="flex items-center space-x-2">
                            {file.type.startsWith('image/') && <Image size={16} className="text-blue-500" />}
                            {file.type.startsWith('video/') && <Film size={16} className="text-green-500" />}
                            {file.type.startsWith('audio/') && <Mic size={16} className="text-purple-500" />}
                            <span className="text-xs text-gray-700 truncate">{file.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute top-1 right-1 text-gray-400 hover:text-red-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - When Did This Happen */}
            <div className="card p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Calendar size={20} className="text-primary-600" />
                <span>When did this happen?</span>
                {selectedTimeZone && (
                  <span className="text-xs text-gray-500 font-normal">
                    (during {timeZones.find(tz => tz.id === selectedTimeZone)?.title})
                  </span>
                )}
              </h2>
              
              <div className="space-y-4">
                
                {/* Date Precision Options */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setDatePrecision('exact')}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      datePrecision === 'exact'
                        ? 'border-primary-600 bg-primary-50 text-primary-900'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">📅 I know the exact date</div>
                    <div className="text-xs text-gray-600">Specific date and time</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setDatePrecision('approximate')}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      datePrecision === 'approximate'
                        ? 'border-primary-600 bg-primary-50 text-primary-900'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">🤔 I remember roughly when</div>
                    <div className="text-xs text-gray-600">Season, year, or general timeframe</div>
                  </button>
                  
                  {selectedTimeZone && (
                    <button
                      type="button"
                      onClick={() => setDatePrecision('era')}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        datePrecision === 'era'
                          ? 'border-primary-600 bg-primary-50 text-primary-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-sm">🕰️ Sometime during {timeZones.find(tz => tz.id === selectedTimeZone)?.title}</div>
                      <div className="text-xs text-gray-600">
                        {timeZones.find(tz => tz.id === selectedTimeZone)?.startDate && timeZones.find(tz => tz.id === selectedTimeZone)?.endDate
                          ? `During ${new Date(timeZones.find(tz => tz.id === selectedTimeZone)!.startDate!).getFullYear()}-${new Date(timeZones.find(tz => tz.id === selectedTimeZone)!.endDate!).getFullYear()}`
                          : 'During this period'
                        }
                      </div>
                    </button>
                  )}
                </div>

                {/* Date Input Fields */}
                {datePrecision === 'exact' && (
                  <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        value={memoryDate}
                        onChange={(e) => setMemoryDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time (optional)</label>
                      <input
                        type="time"
                        value={memoryTime}
                        onChange={(e) => setMemoryTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                {datePrecision === 'approximate' && (
                  <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Describe when this happened</label>
                      <input
                        type="text"
                        value={approximateDate}
                        onChange={(e) => setApproximateDate(e.target.value)}
                        placeholder={selectedTimeZone 
                          ? `e.g., Summer during ${timeZones.find(tz => tz.id === selectedTimeZone)?.title}, Early in the era, Christmas...`
                          : "e.g., Summer 1982, Early 80s, Christmas 1979..."
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      {/* Year Precision Toggle */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">How specific is the year?</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setApproximateDate(prev => prev.includes('-') ? approximateYear : prev)}
                            className={`p-2 rounded-lg border text-left transition-all ${
                              !approximateYear.includes('-')
                                ? 'border-primary-600 bg-primary-50 text-primary-900'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="font-medium text-xs">📅 Single year</div>
                            <div className="text-xs text-gray-600">e.g., 1982</div>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              if (!approximateYear.includes('-')) {
                                setApproximateYear(approximateYear ? `${approximateYear}-${parseInt(approximateYear) + 2}` : '1979-1984')
                              }
                            }}
                            className={`p-2 rounded-lg border text-left transition-all ${
                              approximateYear.includes('-')
                                ? 'border-primary-600 bg-primary-50 text-primary-900'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="font-medium text-xs">📊 Year range</div>
                            <div className="text-xs text-gray-600">e.g., 1979-1984</div>
                          </button>
                        </div>
                      </div>

                      {/* Year Input(s) Based on Choice */}
                      {!approximateYear.includes('-') ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                          <select
                            value={approximateYear}
                            onChange={(e) => setApproximateYear(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          >
                            <option value="">Select year...</option>
                            {Array.from({ length: 80 }, (_, i) => {
                              const year = new Date().getFullYear() - i
                              return (
                                <option key={year} value={year.toString()}>
                                  {year}
                                </option>
                              )
                            })}
                          </select>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Year</label>
                            <select
                              value={approximateYear.split('-')[0] || ''}
                              onChange={(e) => {
                                const endYear = approximateYear.split('-')[1] || ''
                                setApproximateYear(`${e.target.value}-${endYear}`)
                              }}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                              <option value="">Start year...</option>
                              {Array.from({ length: 80 }, (_, i) => {
                                const year = new Date().getFullYear() - i
                                return (
                                  <option key={year} value={year.toString()}>
                                    {year}
                                  </option>
                                )
                              })}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Year</label>
                            <select
                              value={approximateYear.split('-')[1] || ''}
                              onChange={(e) => {
                                const startYear = approximateYear.split('-')[0] || ''
                                setApproximateYear(`${startYear}-${e.target.value}`)
                              }}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            >
                              <option value="">End year...</option>
                              {Array.from({ length: 80 }, (_, i) => {
                                const year = new Date().getFullYear() - i
                                return (
                                  <option key={year} value={year.toString()}>
                                    {year}
                                  </option>
                                )
                              })}
                            </select>
                          </div>
                        </div>
                      )}
                      
                      {selectedTimeZone && timeZones.find(tz => tz.id === selectedTimeZone)?.startDate && (
                        <div className="text-xs text-gray-500">
                          Era: {new Date(timeZones.find(tz => tz.id === selectedTimeZone)!.startDate!).getFullYear()}-{timeZones.find(tz => tz.id === selectedTimeZone)?.endDate ? new Date(timeZones.find(tz => tz.id === selectedTimeZone)!.endDate!).getFullYear() : 'ongoing'}
                        </div>
                      )}
                    </div>
                    <div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Season (optional)</label>
                        <select
                          value={approximateSeason}
                          onChange={(e) => setApproximateSeason(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="">Select season...</option>
                          <option value="Spring">🌸 Spring</option>
                          <option value="Summer">☀️ Summer</option>
                          <option value="Autumn">🍂 Autumn</option>
                          <option value="Winter">❄️ Winter</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {datePrecision === 'era' && selectedTimeZone && (
                  <div className="p-3 bg-primary-50 rounded-lg border border-primary-200">
                    <div className="text-primary-800">
                      <div className="font-medium mb-1 text-sm">Using era dating</div>
                      <div className="text-xs">
                        This memory will be dated to {timeZones.find(tz => tz.id === selectedTimeZone)?.title}
                        {timeZones.find(tz => tz.id === selectedTimeZone)?.startDate && (
                          <span> ({new Date(timeZones.find(tz => tz.id === selectedTimeZone)!.startDate!).getFullYear()})</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Group Organisation - After Memory Content */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <MapPin size={20} className="text-primary-600" />
              <span>Memory Organisation</span>
            </h2>
            
            <div className="space-y-4">
              
              {/* Keep Personal */}
              <button
                type="button"
                onClick={() => {
                  setSelectedTimeZone('')
                  setShowCreateGroup(false)
                }}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  selectedTimeZone === '' && !showCreateGroup
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">📝</span>
                  <div>
                    <div className={`font-medium ${selectedTimeZone === '' && !showCreateGroup ? 'text-primary-900' : 'text-gray-700'}`}>
                      Save as individual memory
                    </div>
                    <div className="text-sm text-gray-600">Don't add to any chapter or era</div>
                  </div>
                </div>
              </button>
              
              {/* Add to Existing Chapter - Only show if chapters exist */}
              {timeZones.length > 0 && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Add to existing chapter:</label>
                  <select
                    value={selectedTimeZone}
                    onChange={(e) => setSelectedTimeZone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={isLoadingTimeZones}
                  >
                    <option value="">Choose a chapter...</option>
                    {timeZones.map((tz) => (
                      <option key={tz.id} value={tz.id}>
                        {tz.type === 'GROUP' ? '📖' : '🔒'} {tz.title}
                        {tz.startDate && tz.endDate && ` (${new Date(tz.startDate).getFullYear()}-${new Date(tz.endDate).getFullYear()})`}
                    </option>
                  ))}
                </select>
              </div>
              )}
              
              {/* Create New Chapter */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  {timeZones.length === 0 ? 'Create your first chapter:' : 'Or create new chapter:'}
                </label>
                {timeZones.length === 0 ? (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <span className="text-blue-800">💡 You don't have any chapters yet.</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTimeZone('')
                          setShowCreateGroup(false)
                        }}
                        className="p-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colours text-sm text-center"
                      >
                        <div className="font-medium">Skip for now</div>
                        <div className="text-xs text-gray-600">Save as individual memory</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateGroup(true)}
                        className="p-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colours text-sm text-center"
                      >
                        <div className="font-medium">Create first chapter</div>
                        <div className="text-xs text-primary-100">Organise memories by era</div>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCreateGroup(!showCreateGroup)}
                    className="w-full px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colours flex items-center justify-center space-x-2"
                  >
                    <Plus size={18} />
                    <span>New Chapter</span>
                  </button>
                )}
              </div>
            </div>
            
            {/* Group Explanation */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-blue-800">
                <div className="font-medium text-sm mb-1">💡 Why create a group?</div>
                <div className="text-xs leading-relaxed">
                  Groups help you organise memories from the same period of your life (like "University Days" or "The Cocke Hotel"). 
                  The group represents the <strong>broader time period or era</strong> (e.g., 1979-1984), whilst individual memories are 
                  specific events within that era. Once you create a group, you can add more memories to it later - perfect for building 
                  up stories from shared experiences with friends and family.
                </div>
              </div>
            </div>
            
            {/* Quick Group Creation Form */}
            {showCreateGroup && (
              <div className="mt-6 p-4 bg-gray-50 rounded-xl border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Group/Era</h3>
                
                {/* Date Template Option */}
                {((datePrecision === 'approximate' && approximateYear) || (datePrecision === 'era' && selectedTimeZone)) && (
                  <div className="mb-6 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="text-amber-800">
                      <div className="font-medium text-sm mb-2">💡 Use memory dates as group template?</div>
                      <div className="text-xs mb-3 leading-relaxed">
                        Your memory is dated as {datePrecision === 'approximate' ? `around ${approximateYear}` : datePrecision === 'era' ? 'era-based' : 'approximately'}. 
                        Would you like to use this as a starting point for your group's date range? 
                        You can then expand it to cover the full period (e.g., if your memory is from 1982, you might want the group to span 1979-1984).
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (datePrecision === 'approximate' && approximateYear) {
                              setGroupDatePrecision('estimated')
                              setGroupStartYear(approximateYear)
                              setGroupEndYear(approximateYear)
                            } else if (datePrecision === 'era' && selectedTimeZone) {
                              // For era-based, we could get the time zone's date range
                              const selectedTz = timeZones.find(tz => tz.id === selectedTimeZone)
                              if (selectedTz && selectedTz.startDate && selectedTz.endDate) {
                                setGroupDatePrecision('estimated')
                                setGroupStartYear(new Date(selectedTz.startDate).getFullYear().toString())
                                setGroupEndYear(new Date(selectedTz.endDate).getFullYear().toString())
                              }
                            }
                          }}
                          className="px-3 py-1 bg-amber-600 text-white rounded text-xs hover:bg-amber-700 transition-colours"
                        >
                          Yes, use as template
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            // Just continue with empty form - no action needed
                          }}
                          className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 transition-colours"
                        >
                          No, start fresh
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Group Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Group Name *</label>
                  <input
                    type="text"
                    value={newGroupTitle}
                    onChange={(e) => setNewGroupTitle(e.target.value)}
                    placeholder="e.g., The Cocke Hotel, University Days, Family Holidays..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Date Precision Toggle */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">How specific are your dates?</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setGroupDatePrecision('estimated')}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        groupDatePrecision === 'estimated'
                          ? 'border-primary-600 bg-primary-50 text-primary-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-sm">📅 Estimated years</div>
                      <div className="text-xs text-gray-600">I know roughly when (e.g., 1979-1984)</div>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setGroupDatePrecision('exact')}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        groupDatePrecision === 'exact'
                          ? 'border-primary-600 bg-primary-50 text-primary-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-sm">🎯 Exact dates</div>
                      <div className="text-xs text-gray-600">I know specific start/end dates</div>
                    </button>
                  </div>
                </div>

                {/* Date Inputs Based on Precision */}
                {groupDatePrecision === 'estimated' ? (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Year</label>
                      <select
                        value={groupStartYear}
                        onChange={(e) => setGroupStartYear(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Select year...</option>
                        {Array.from({ length: 70 }, (_, i) => {
                          const year = new Date().getFullYear() - i
                          return (
                            <option key={year} value={year.toString()}>
                              {year}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Year</label>
                      <select
                        value={groupEndYear}
                        onChange={(e) => setGroupEndYear(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      >
                        <option value="">Select year...</option>
                        <option value="ongoing">Ongoing</option>
                        {Array.from({ length: 70 }, (_, i) => {
                          const year = new Date().getFullYear() - i
                          return (
                            <option key={year} value={year.toString()}>
                              {year}
                            </option>
                          )
                        })}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={newGroupStartDate}
                        onChange={(e) => setNewGroupStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                      <input
                        type="date"
                        value={newGroupEndDate}
                        onChange={(e) => setNewGroupEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                {/* Location and Type */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <input
                      type="text"
                      value={newGroupLocation}
                      onChange={(e) => setNewGroupLocation(e.target.value)}
                      placeholder="e.g., London, Manchester, Home..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={newGroupType}
                      onChange={(e) => setNewGroupType(e.target.value as 'PERSONAL' | 'GROUP')}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="GROUP">👥 Shared Group</option>
                      <option value="PERSONAL">🔒 Personal Era</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
                  <textarea
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder="Describe what this group/era represents..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Group Image */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Group Image (optional)</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary-400 transition-colours">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setNewGroupImage(e.target.files?.[0] || null)}
                      className="hidden"
                      id="group-image-upload"
                    />
                    <label htmlFor="group-image-upload" className="cursor-pointer">
                      {newGroupImage ? (
                        <div className="flex items-center justify-center space-x-2">
                          <span className="text-primary-600 text-sm">📷 {newGroupImage.name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              setNewGroupImage(null)
                            }}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="text-gray-400 mb-2">📷</div>
                          <p className="text-gray-600 text-sm">Click to add a group image</p>
                          <p className="text-xs text-gray-500">Will represent this era in your timeline</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Enhanced Preview */}
                {newGroupTitle && (groupStartYear || newGroupStartDate) && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Preview of your group:</h4>
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      {/* Header with optional image */}
                      <div className="relative">
                        {newGroupImage ? (
                          <div className="relative bg-gradient-to-r from-primary-400 to-primary-600">
                            <img
                              src={URL.createObjectURL(newGroupImage)}
                              alt="Group preview"
                              className="w-full max-h-48 object-contain bg-gray-100"
                              style={{ minHeight: '120px' }}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-10"></div>
                          </div>
                        ) : (
                          <div className="h-24 bg-gradient-to-r from-primary-400 to-primary-600"></div>
                        )}
                        
                        {/* Group type badge */}
                        <div className="absolute top-3 right-3">
                          <span className="px-2 py-1 bg-white bg-opacity-90 rounded-full text-xs font-medium text-gray-700">
                            {newGroupType === 'GROUP' ? '👥 Shared' : '🔒 Personal'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {newGroupTitle}
                            </h3>
                            
                            {/* Date range */}
                            <div className="flex items-center text-sm text-gray-600 mb-2">
                              <Calendar size={14} className="mr-1" />
                              {groupDatePrecision === 'estimated' && groupStartYear && (
                                <span>{groupStartYear}{groupEndYear && groupEndYear !== 'ongoing' ? `-${groupEndYear}` : groupEndYear === 'ongoing' ? '-ongoing' : ''}</span>
                              )}
                              {groupDatePrecision === 'exact' && newGroupStartDate && (
                                <span>{new Date(newGroupStartDate).getFullYear()}{newGroupEndDate ? `-${new Date(newGroupEndDate).getFullYear()}` : ''}</span>
                              )}
                            </div>
                            
                            {/* Location */}
                            {newGroupLocation && (
                              <div className="flex items-center text-sm text-gray-600 mb-3">
                                <MapPin size={14} className="mr-1" />
                                <span>{newGroupLocation}</span>
                              </div>
                            )}
                            
                            {/* Description */}
                            {newGroupDescription && (
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {newGroupDescription}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {/* Stats preview */}
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                          <div className="flex space-x-4">
                            <div className="text-xs text-gray-500">
                              <span className="font-medium">0</span> memories
                            </div>
                            <div className="text-xs text-gray-500">
                              <span className="font-medium">1</span> member
                            </div>
                          </div>
                          <div className="text-xs text-primary-600 font-medium">
                            ✨ New Group
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleCreateGroup}
                    disabled={!newGroupTitle.trim() || isCreatingGroup || (!groupStartYear && !newGroupStartDate)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isCreatingGroup ? 'Creating...' : 'Create Group'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateGroup(false)
                      setGroupDatePrecision('estimated')
                      setGroupStartYear('')
                      setGroupEndYear('')
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {/* Selected Group Confirmation */}
            {selectedTimeZone && (
              <div className="mt-4 p-3 bg-primary-50 rounded-lg border border-primary-200">
                <div className="flex items-center space-x-2 text-primary-700">
                  <span className="text-lg">✓</span>
                  <span className="font-medium text-sm">
                    Will be added to: {timeZones.find(tz => tz.id === selectedTimeZone)?.title}
                    {timeZones.find(tz => tz.id === selectedTimeZone)?.location && (
                      <span className="text-primary-600"> • {timeZones.find(tz => tz.id === selectedTimeZone)?.location}</span>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-6 pb-12">
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !content.trim()}
              className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
            >
              {isSubmitting ? 'Creating Memory...' : 'Create Memory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 