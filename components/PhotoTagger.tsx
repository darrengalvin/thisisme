'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { X, Tag, Plus, Search, Loader2, User } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import toast from 'react-hot-toast'

interface PhotoTaggerProps {
  imageUrl: string
  mediaId: string
  memoryId: string
  existingTags: PhotoTag[]
  onSave: (tags: PhotoTag[]) => void
  onClose: () => void
}

interface PhotoTag {
  id?: string
  media_id: string
  tagged_person_id: string
  tagged_person_name: string
  x_position: number
  y_position: number
  tag_width?: number
  tag_height?: number
  created_at?: string
}

interface NetworkPerson {
  id: string
  person_name: string
  person_email?: string
  is_platform_user?: boolean
}

export default function PhotoTagger({
  imageUrl,
  mediaId,
  memoryId,
  existingTags: initialTags,
  onSave,
  onClose,
}: PhotoTaggerProps) {
  const { user } = useAuth()
  const imageRef = useRef<HTMLImageElement>(null)
  const [tags, setTags] = useState<PhotoTag[]>(initialTags)
  const [newTagPosition, setNewTagPosition] = useState<{ x: number; y: number } | null>(null)
  const [networkPeople, setNetworkPeople] = useState<NetworkPerson[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredPeople, setFilteredPeople] = useState<NetworkPerson[]>([])
  const [loadingNetwork, setLoadingNetwork] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hoveredTag, setHoveredTag] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      fetchNetworkPeople()
    }
  }, [user])

  // Debug: Log tags whenever they change
  useEffect(() => {
    console.log('PhotoTagger tags updated:', tags)
  }, [tags])

  useEffect(() => {
    setFilteredPeople(
      networkPeople.filter((p) =>
        p.person_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  }, [searchTerm, networkPeople])

  const fetchNetworkPeople = async () => {
    if (!user) return
    setLoadingNetwork(true)
    try {
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })
      if (!tokenResponse.ok) throw new Error('Failed to get token')
      const { token } = await tokenResponse.json()

      const response = await fetch('/api/network', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (response.ok) {
        const { people } = await response.json()
        setNetworkPeople(people)
      } else {
        toast.error('Failed to load your network.')
      }
    } catch (error) {
      console.error('Error fetching network people:', error)
      toast.error('Error loading network.')
    } finally {
      setLoadingNetwork(false)
    }
  }

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!imageRef.current) return

      const rect = imageRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100

      setNewTagPosition({ x, y })
      setSearchTerm('') // Clear search when opening new tag dialog
    },
    []
  )

  const handleSelectPerson = async (person: NetworkPerson) => {
    if (!user || !newTagPosition) return

    // Check if this person is already tagged in this photo
    if (tags.some(t => t.tagged_person_id === person.id)) {
      toast.error(`${person.person_name} is already tagged in this photo.`)
      setNewTagPosition(null)
      return;
    }

    const newTag: PhotoTag = {
      media_id: mediaId,
      tagged_person_id: person.id,
      tagged_person_name: person.person_name,
      x_position: parseFloat(newTagPosition.x.toFixed(2)),
      y_position: parseFloat(newTagPosition.y.toFixed(2)),
      tag_width: 10, // Default size
      tag_height: 10, // Default size
    }

    setTags((prev) => [...prev, newTag])
    setNewTagPosition(null)
    toast.success(`${person.person_name} tagged!`)
  }

  const handleCreateNewPerson = async () => {
    if (!user || !searchTerm.trim()) return

    setIsSaving(true)
    try {
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })
      if (!tokenResponse.ok) throw new Error('Failed to get token')
      const { token } = await tokenResponse.json()

      const response = await fetch('/api/network', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ person_name: searchTerm.trim() }),
      })

      if (response.ok) {
        const { person: newNetworkPerson } = await response.json()
        setNetworkPeople((prev) => [...prev, newNetworkPerson])
        toast.success(`'${newNetworkPerson.person_name}' added to your network!`)
        handleSelectPerson(newNetworkPerson) // Tag the new person immediately
      } else {
        toast.error('Failed to add new person.')
      }
    } catch (error) {
      console.error('Error creating new person:', error)
      toast.error('Error adding new person.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveTag = (tagId: string | undefined, personId: string) => {
    if (tagId) {
      setTags((prev) => prev.filter((t) => t.id !== tagId))
    } else {
      // If tag doesn't have an ID yet (newly added), remove by personId
      setTags((prev) => prev.filter((t) => t.tagged_person_id !== personId))
    }
    toast.success('Tag removed.')
  }

  const handleSaveTags = async () => {
    if (!user) return
    setIsSaving(true)
    try {
      console.log('🏷️ PHOTO TAGGER: Starting save process...')
      console.log('🏷️ PHOTO TAGGER: Tags to save:', tags)
      
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })
      if (!tokenResponse.ok) throw new Error('Failed to get token')
      const { token } = await tokenResponse.json()

      // Prepare tags for API: remove temporary client-side IDs and person names
      const tagsToSave = tags.map(({ id, tagged_person_name, ...rest }) => rest);
      console.log('🏷️ PHOTO TAGGER: Prepared tags for API:', tagsToSave)

      const response = await fetch(`/api/media/${mediaId}/photo-tags`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tags: tagsToSave }),
      })

      console.log('🏷️ PHOTO TAGGER: API Response status:', response.status)
      
      if (response.ok) {
        const responseData = await response.json()
        console.log('🏷️ PHOTO TAGGER: API Response data:', responseData)
        onSave(responseData.tags || []) // Pass saved tags back to parent
        toast.success('Photo tags saved!')
        onClose()
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('🏷️ PHOTO TAGGER: API Error:', response.status, errorData)
        toast.error(`Failed to save tags: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('🏷️ PHOTO TAGGER: Error saving tags:', error)
      toast.error(`Error saving tags: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Tag People in Photo</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Image Area */}
          <div className="relative flex-1 flex items-center justify-center bg-slate-100 p-4">
            <div
              className="relative max-w-full max-h-full cursor-crosshair"
              onClick={handleImageClick}
            >
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Memory Photo"
                className="max-w-full max-h-[calc(90vh-200px)] object-contain rounded-lg shadow-md"
                onLoad={(e) => {
                  // Optional: Adjust image container size if needed
                }}
              />

              {/* Existing Tags */}
              {tags.length > 0 && console.log('Rendering tags:', tags)}
              {tags.map((tag, index) => {
                console.log('Rendering tag:', tag, 'at position:', tag.x_position, tag.y_position)
                return (
                  <div
                    key={tag.id || `${tag.tagged_person_id}-${index}`}
                    className="absolute border-3 border-blue-500 bg-blue-500/30 rounded-lg cursor-pointer group transition-all duration-200 hover:border-blue-600 hover:bg-blue-500/40 shadow-lg"
                    style={{
                      left: `${tag.x_position - (tag.tag_width || 10) / 2}%`,
                      top: `${tag.y_position - (tag.tag_height || 10) / 2}%`,
                      width: `${tag.tag_width || 10}%`,
                      height: `${tag.tag_height || 10}%`,
                      minWidth: '80px',
                      minHeight: '50px',
                      zIndex: 10,
                    }}
                    onMouseEnter={() => setHoveredTag(tag.id || tag.tagged_person_id!)}
                    onMouseLeave={() => setHoveredTag(null)}
                  >
                    {/* Always show name for new unsaved tags, or on hover for saved tags */}
                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-blue-700 text-white text-sm rounded-md whitespace-nowrap transition-opacity duration-200 shadow-lg ${
                      !tag.id || hoveredTag === (tag.id || tag.tagged_person_id!) 
                        ? 'opacity-100' 
                        : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      {tag.tagged_person_name}
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent image click
                          handleRemoveTag(tag.id, tag.tagged_person_id);
                        }}
                        className="ml-2 text-red-300 hover:text-red-100 transition-colors"
                        title="Remove tag"
                      >
                        <X size={12} />
                      </button>
                      {/* Arrow pointing down */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-blue-700"></div>
                    </div>
                    
                    {/* Tag indicator - more visible */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow-sm"></div>
                  </div>
                )
              })}

              {/* New Tag Selection UI */}
              {newTagPosition && (
                <div
                  className="absolute border-2 border-green-500 bg-green-500/20 rounded-md animate-pulse"
                  style={{
                    left: `${newTagPosition.x - 5}%`, // Default 10% width, so -5% for center
                    top: `${newTagPosition.y - 5}%`, // Default 10% height, so -5% for center
                    width: '10%',
                    height: '10%',
                  }}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-green-700 text-white text-xs rounded-md whitespace-nowrap">
                    Tag here
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewTagPosition(null);
                      }}
                      className="ml-2 text-white/70 hover:text-white"
                      title="Cancel tag"
                    >
                      <X size={10} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tagging Controls / Person Selector */}
          {newTagPosition && (
            <div className="w-full lg:w-80 bg-white p-4 border-l border-slate-200 flex flex-col">
              <h3 className="text-lg font-semibold mb-4">Who is this?</h3>
              <div className="relative mb-4">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search or add person..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {loadingNetwork ? (
                  <div className="text-center text-slate-500 py-8">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                    <p>Loading your network...</p>
                  </div>
                ) : (
                  <>
                    {/* Show matching people from network */}
                    {filteredPeople.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
                          Your Network
                        </div>
                        {filteredPeople.map((person) => (
                          <button
                            key={person.id}
                            onClick={() => handleSelectPerson(person)}
                            className="flex items-center w-full p-3 rounded-lg hover:bg-slate-100 transition-colors text-left border border-transparent hover:border-blue-200"
                          >
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <User size={16} className="text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-slate-800">{person.person_name}</div>
                              {person.person_email && (
                                <div className="text-sm text-slate-500">{person.person_email}</div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Always show "Add new person" option if there's search text */}
                    {searchTerm.trim() && (
                      <div className="space-y-2">
                        {filteredPeople.length > 0 && (
                          <div className="border-t border-slate-200 my-3"></div>
                        )}
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2">
                          Add New Person
                        </div>
                        <button
                          onClick={handleCreateNewPerson}
                          disabled={isSaving}
                          className="flex items-center w-full p-3 rounded-lg hover:bg-green-50 transition-colors text-left border border-dashed border-green-300 hover:border-green-400 disabled:opacity-50"
                        >
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                            <Plus size={16} className="text-green-600" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-green-800">
                              {isSaving ? 'Adding...' : `Add "${searchTerm}"`}
                            </div>
                            <div className="text-sm text-green-600">
                              Create new contact and tag them
                            </div>
                          </div>
                        </button>
                      </div>
                    )}

                    {/* Empty state when no search term */}
                    {!searchTerm.trim() && networkPeople.length === 0 && (
                      <div className="text-center text-slate-500 py-8">
                        <User size={32} className="mx-auto mb-3 text-slate-400" />
                        <p className="font-medium mb-1">No people in your network yet</p>
                        <p className="text-sm">Start typing a name to add someone new</p>
                      </div>
                    )}

                    {/* Empty state when no search term but have network */}
                    {!searchTerm.trim() && networkPeople.length > 0 && (
                      <div className="text-center text-slate-500 py-8">
                        <Search size={32} className="mx-auto mb-3 text-slate-400" />
                        <p className="font-medium mb-1">Search your network</p>
                        <p className="text-sm">Type a name to find someone or add someone new</p>
                      </div>
                    )}

                    {/* No matches but have search term */}
                    {searchTerm.trim() && filteredPeople.length === 0 && networkPeople.length > 0 && (
                      <div className="text-center text-slate-500 py-4">
                        <p className="text-sm mb-3">No matches found in your network</p>
                        <p className="text-xs text-slate-400">Use the "Add new person" option above</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => setNewTagPosition(null)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex justify-between items-center p-4 border-t border-slate-200 bg-slate-50">
          <div className="text-sm text-slate-600">
            {tags.length} {tags.length === 1 ? 'person' : 'people'} tagged
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTags}
              disabled={isSaving}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Tag size={18} />
                  <span>Save Photo Tags</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}