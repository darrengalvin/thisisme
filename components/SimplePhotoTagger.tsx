'use client'

import { useState, useEffect } from 'react'
import { X, Tag, UserPlus, Check } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import toast from 'react-hot-toast'

interface Person {
  id: string
  person_name: string
  photo_url?: string
  relationship?: string
}

interface PhotoTag {
  x_position: number
  y_position: number
  tagged_person_id: string
  tagged_person_name: string
}

interface SimplePhotoTaggerProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  mediaId: string
  memoryTitle?: string
  onNavigateToMyPeople?: () => void
}

export default function SimplePhotoTagger({
  isOpen,
  onClose,
  imageUrl,
  mediaId,
  memoryTitle,
  onNavigateToMyPeople
}: SimplePhotoTaggerProps) {
  const { user } = useAuth()
  const [people, setPeople] = useState<Person[]>([])
  const [tags, setTags] = useState<PhotoTag[]>([])
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null)
  const [loadingPeople, setLoadingPeople] = useState(true)
  const [savingTag, setSavingTag] = useState(false)

  useEffect(() => {
    if (isOpen && user) {
      loadPeople()
      loadExistingTags()
    }
  }, [isOpen, user])

  const loadPeople = async () => {
    if (!user) return
    try {
      setLoadingPeople(true)
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })
      
      if (!tokenResponse.ok) return
      const { token } = await tokenResponse.json()

      const response = await fetch('/api/network', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPeople(data)
      }
    } catch (error) {
      console.error('Error loading people:', error)
    } finally {
      setLoadingPeople(false)
    }
  }

  const loadExistingTags = async () => {
    if (!user) return
    try {
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })
      
      if (!tokenResponse.ok) return
      const { token } = await tokenResponse.json()

      const response = await fetch(`/api/media/${mediaId}/photo-tags`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setTags(data.tags || [])
      }
    } catch (error) {
      console.error('Error loading tags:', error)
    }
  }

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedPerson) {
      toast.error('Please select a person first')
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setClickPosition({ x, y })
    saveTag(x, y)
  }

  const saveTag = async (x: number, y: number) => {
    if (!selectedPerson || !user) return

    setSavingTag(true)
    try {
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })
      
      if (!tokenResponse.ok) {
        toast.error('Authentication failed')
        return
      }
      const { token } = await tokenResponse.json()

      const response = await fetch(`/api/media/${mediaId}/photo-tags`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taggedPersonId: selectedPerson.id,
          xPosition: x,
          yPosition: y
        })
      })

      if (response.ok) {
        toast.success(`Tagged ${selectedPerson.person_name}!`)
        setTags([...tags, {
          x_position: x,
          y_position: y,
          tagged_person_id: selectedPerson.id,
          tagged_person_name: selectedPerson.person_name
        }])
        setClickPosition(null)
        setSelectedPerson(null)
      } else {
        toast.error('Failed to save tag')
      }
    } catch (error) {
      console.error('Error saving tag:', error)
      toast.error('Failed to save tag')
    } finally {
      setSavingTag(false)
    }
  }

  const deleteTag = async (tagIndex: number) => {
    // For now, just remove from local state
    // You can add DELETE API call if needed
    const newTags = tags.filter((_, i) => i !== tagIndex)
    setTags(newTags)
    toast.success('Tag removed')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Tag className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Tag People in Photo</h2>
                {memoryTitle && <p className="text-sm text-gray-600">{memoryTitle}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Image Area */}
            <div className="lg:col-span-2">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-700 mb-4 flex items-center">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-bold mr-2">1</span>
                  Select a person from the list, then click on the photo to tag them
                </p>
                <div
                  className="relative cursor-crosshair rounded-lg overflow-hidden shadow-lg"
                  onClick={handleImageClick}
                  style={{ aspectRatio: 'auto' }}
                >
                  <img
                    src={imageUrl}
                    alt="Photo to tag"
                    className="w-full h-auto"
                  />
                  
                  {/* Existing Tags */}
                  {tags.map((tag, index) => (
                    <div
                      key={index}
                      className="absolute group"
                      style={{
                        left: `${tag.x_position}%`,
                        top: `${tag.y_position}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      <div className="bg-blue-600 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-lg whitespace-nowrap flex items-center space-x-1">
                        <span>{tag.tagged_person_name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteTag(index)
                          }}
                          className="hover:bg-blue-700 rounded-full p-0.5 ml-1"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Click Position Indicator */}
                  {clickPosition && (
                    <div
                      className="absolute w-3 h-3 bg-yellow-400 border-2 border-white rounded-full animate-ping"
                      style={{
                        left: `${clickPosition.x}%`,
                        top: `${clickPosition.y}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* People Selection */}
            <div className="lg:col-span-1">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-700 mb-4 flex items-center">
                  <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-xs font-bold mr-2">2</span>
                  Select who to tag
                </p>

                {loadingPeople ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300 mx-auto"></div>
                    <p className="text-gray-500 text-sm mt-2">Loading people...</p>
                  </div>
                ) : people.length > 0 ? (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {people.map((person) => (
                      <button
                        key={person.id}
                        onClick={() => setSelectedPerson(person)}
                        className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all ${
                          selectedPerson?.id === person.id
                            ? 'bg-blue-100 border-2 border-blue-500'
                            : 'bg-white border-2 border-transparent hover:bg-gray-100'
                        }`}
                      >
                        {person.photo_url ? (
                          <img
                            src={person.photo_url}
                            alt={person.person_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-600 font-medium">
                              {person.person_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-900">{person.person_name}</p>
                          {person.relationship && (
                            <p className="text-xs text-gray-500">{person.relationship}</p>
                          )}
                        </div>
                        {selectedPerson?.id === person.id && (
                          <Check className="w-5 h-5 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium mb-2">No people in your network</p>
                    <p className="text-gray-500 text-sm mb-4">Add people to start tagging them in photos</p>
                    <button
                      onClick={() => {
                        onClose()
                        onNavigateToMyPeople?.()
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Add People
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0 bg-gray-50">
          <div className="text-sm text-gray-600">
            {tags.length} {tags.length === 1 ? 'person' : 'people'} tagged
          </div>
          <button
            onClick={onClose}
            className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

