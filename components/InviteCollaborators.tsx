'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { Mail, UserPlus, Send, Copy, Check, Users, Crown, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'

interface NetworkPerson {
  id: string
  person_name: string
  person_email?: string
  person_phone?: string
  relationship?: string
  photo_url?: string
  pending_chapter_invitations?: string[]
}

interface InviteCollaboratorsProps {
  chapterId: string
  chapterTitle: string
  className?: string
  onInviteSent?: () => void
  onNavigateToMyPeople?: () => void
}

export default function InviteCollaborators({ 
  chapterId, 
  chapterTitle,
  className = '',
  onInviteSent,
  onNavigateToMyPeople
}: InviteCollaboratorsProps) {
  const { user, session } = useAuth()
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteMethod, setInviteMethod] = useState<'people' | 'add_people' | 'link'>('people')
  const [inviteMessage, setInviteMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  
  // Network people state
  const [networkPeople, setNetworkPeople] = useState<NetworkPerson[]>([])
  const [selectedPeople, setSelectedPeople] = useState<string[]>([])
  const [loadingPeople, setLoadingPeople] = useState(false)

  // Fetch network people
  const fetchNetworkPeople = async () => {
    if (!user || !user.id || !user.email) {
      console.log('👥 INVITE: Skipping fetch - user not fully loaded:', { hasUser: !!user, hasId: !!user?.id, hasEmail: !!user?.email })
      return
    }
    
    setLoadingPeople(true)
    try {
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      if (!tokenResponse.ok) {
        throw new Error('Authentication failed')
      }

      const { token } = await tokenResponse.json()

      const response = await fetch('/api/network', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setNetworkPeople(data.people || [])
        console.log('👥 INVITE: Fetched network people:', data.people?.length || 0)
        console.log('👥 INVITE: Network people IDs:', data.people?.map((p: any) => ({ id: p.id, name: p.person_name })))
        console.log('👥 INVITE: People with chapter access:', data.people?.filter((p: any) => p.pending_chapter_invitations?.includes(chapterId)).map((p: any) => p.person_name))
      } else {
        console.error('Failed to fetch network people')
        toast.error('Failed to load your network')
      }
    } catch (error) {
      console.error('Error fetching network people:', error)
      toast.error('Failed to load your network')
    } finally {
      setLoadingPeople(false)
    }
  }

  // Add selected people to chapter
  const addPeopleToChapter = async () => {
    if (!user || selectedPeople.length === 0) return

    setSending(true)
    try {
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      if (!tokenResponse.ok) {
        throw new Error('Authentication failed')
      }

      const { token } = await tokenResponse.json()

      // Add each selected person to the chapter
      const addPromises = selectedPeople.map(async (personId) => {
        const person = networkPeople.find(p => p.id === personId)
        if (!person) return

        console.log('👥 INVITE: Adding person to chapter:', { personId, personName: person.person_name, chapterId })

        const response = await fetch('/api/chapters/add-member', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            chapterId,
            personId,
            personName: person.person_name,
            personEmail: person.person_email
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('👥 INVITE: Failed to add person:', { 
            personName: person.person_name, 
            status: response.status, 
            error: errorData 
          })
          throw new Error(`Failed to add ${person.person_name}: ${errorData.error || response.statusText}`)
        }

        const result = await response.json()
        console.log('👥 INVITE: Successfully added person:', { personName: person.person_name, result })
        return person
      })

      await Promise.all(addPromises)
      
      console.log('👥 INVITE: Added people to chapter:', selectedPeople.length)
      toast.success(`Added ${selectedPeople.length} people to the chapter!`)
      
      // Refresh the network people list to update "Already added" status
      await fetchNetworkPeople()
      
      // Reset form
      setSelectedPeople([])
      setShowInviteForm(false)
      
      if (onInviteSent) {
        onInviteSent()
      }
    } catch (error) {
      console.error('Error adding people to chapter:', error)
      toast.error('Failed to add people to chapter')
    } finally {
      setSending(false)
    }
  }

  // Load network people when switching to people method
  useEffect(() => {
    if (inviteMethod === 'people' && networkPeople.length === 0 && user?.id && user?.email) {
      fetchNetworkPeople()
    }
  }, [inviteMethod, networkPeople.length, user?.id, user?.email])

  // Generate share link
  const generateShareLink = async () => {
    try {
      console.log('🔗 INVITE: Generating share link for chapter:', chapterId)

      // Get JWT token
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, email: user?.email }),
      })

      if (!tokenResponse.ok) {
        toast.error('Authentication failed')
        return
      }

      const { token } = await tokenResponse.json()

      // Generate invite link
      const response = await fetch('/api/chapters/invite-link', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chapterId,
          expiresIn: 7 * 24 * 60 * 60 * 1000 // 7 days
        })
      })

      if (response.ok) {
        const data = await response.json()
        setShareLink(data.inviteLink)
        console.log('🔗 INVITE: Share link generated:', data.inviteLink)
      } else {
        // Fallback: create a simple share link
        const fallbackLink = `${window.location.origin}/join/${chapterId}?invited=true`
        setShareLink(fallbackLink)
        console.log('🔗 INVITE: Using fallback share link:', fallbackLink)
      }
    } catch (error) {
      console.error('🔗 INVITE: Error generating share link:', error)
      // Fallback: create a simple share link
      const fallbackLink = `${window.location.origin}/join/${chapterId}?invited=true`
      setShareLink(fallbackLink)
    }
  }

  // Copy link to clipboard
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setLinkCopied(true)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
      toast.error('Failed to copy link')
    }
  }


  if (!user) return null

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Collaborate
          </h3>
        </div>

        {/* Invite Button */}
        <button
          onClick={() => {
            setShowInviteForm(!showInviteForm)
            if (!showInviteForm && inviteMethod === 'link' && !shareLink) {
              generateShareLink()
            }
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite People</span>
        </button>
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 space-y-4">
          {/* Method Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              How would you like to invite people?
            </label>
            <div className="space-y-2">
              <button
                onClick={() => setInviteMethod('people')}
                className={`w-full flex items-start space-x-3 px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                  inviteMethod === 'people'
                    ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-100'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <UserCheck className={`w-5 h-5 flex-shrink-0 mt-0.5 ${inviteMethod === 'people' ? 'text-blue-600' : 'text-slate-400'}`} />
                <div className="text-left flex-1">
                  <div className={`font-medium ${inviteMethod === 'people' ? 'text-blue-900' : 'text-slate-900'}`}>Pick from My People</div>
                  <div className="text-xs text-slate-500 mt-0.5">Select existing contacts from your network</div>
                </div>
              </button>
              <button
                onClick={() => setInviteMethod('add_people')}
                className={`w-full flex items-start space-x-3 px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                  inviteMethod === 'add_people'
                    ? 'bg-green-50 border-green-500 ring-2 ring-green-100'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <UserPlus className={`w-5 h-5 flex-shrink-0 mt-0.5 ${inviteMethod === 'add_people' ? 'text-green-600' : 'text-slate-400'}`} />
                <div className="text-left flex-1">
                  <div className={`font-medium ${inviteMethod === 'add_people' ? 'text-green-900' : 'text-slate-900'}`}>Add to My People First</div>
                  <div className="text-xs text-slate-500 mt-0.5">Add new contacts to your network first</div>
                </div>
              </button>
              <button
                onClick={() => {
                  setInviteMethod('link')
                  if (!shareLink) {
                    generateShareLink()
                  }
                }}
                className={`w-full flex items-start space-x-3 px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                  inviteMethod === 'link'
                    ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-100'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Copy className={`w-5 h-5 flex-shrink-0 mt-0.5 ${inviteMethod === 'link' ? 'text-purple-600' : 'text-slate-400'}`} />
                <div className="text-left flex-1">
                  <div className={`font-medium ${inviteMethod === 'link' ? 'text-purple-900' : 'text-slate-900'}`}>Share Link</div>
                  <div className="text-xs text-slate-500 mt-0.5">Copy link and share manually</div>
                </div>
              </button>
            </div>
          </div>

          {/* Add to My People First */}
          {inviteMethod === 'add_people' && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <UserPlus className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  Add People to Your Network First
                </h3>
                <p className="text-green-700 mb-4">
                  To invite people to collaborate on this chapter, you need to add them to your "My People" network first. 
                  This way you can track all your relationships and easily invite them to future chapters.
                </p>
                <button
                  onClick={() => {
                    if (onNavigateToMyPeople) {
                      onNavigateToMyPeople()
                    } else {
                      window.location.href = '/my-people'
                    }
                  }}
                  className="inline-flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Go to My People</span>
                </button>
                <p className="text-sm text-green-600 mt-3">
                  After adding people, come back here and select "Pick from My People"
                </p>
              </div>
            </div>
          )}

          {/* Pick from My People */}
          {inviteMethod === 'people' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select people from your network
                </label>
                
                {loadingPeople ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-500">Loading your network...</span>
                  </div>
                ) : networkPeople.length === 0 ? (
                  <div className="text-center py-8">
                    <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No people in your network yet</p>
                    <a
                      href="/my-people"
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Add people to your network first
                    </a>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {networkPeople.map((person) => {
                      const alreadyAdded = person.pending_chapter_invitations?.includes(chapterId)
                      return (
                        <label
                          key={person.id}
                          className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 ${
                            alreadyAdded
                              ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                              : selectedPeople.includes(person.id)
                              ? 'bg-blue-50 border-blue-200 cursor-pointer'
                              : 'bg-white border-gray-200 hover:bg-gray-50 cursor-pointer'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedPeople.includes(person.id) || alreadyAdded}
                            disabled={alreadyAdded}
                            onChange={(e) => {
                              if (alreadyAdded) return
                              if (e.target.checked) {
                                setSelectedPeople(prev => [...prev, person.id])
                              } else {
                                setSelectedPeople(prev => prev.filter(id => id !== person.id))
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            {person.photo_url ? (
                              <img
                                src={person.photo_url}
                                alt={person.person_name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <UserCheck className="w-4 h-4 text-gray-500" />
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900">
                                  {person.person_name}
                                </p>
                                {alreadyAdded && (
                                  <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded">
                                    Already added
                                  </span>
                                )}
                              </div>
                              {person.relationship && (
                                <p className="text-xs text-gray-500">
                                  {person.relationship}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </label>
                    )
                  })}
                  </div>
                )}
              </div>

              {selectedPeople.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      {selectedPeople.length} person{selectedPeople.length !== 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <p className="text-sm text-blue-700">
                    These people will be added directly to the chapter and can start collaborating immediately.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowInviteForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addPeopleToChapter}
                  disabled={sending || selectedPeople.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Add to Chapter</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Share Link */}
          {inviteMethod === 'link' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share this link with people you want to invite
                </label>
                {shareLink ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm"
                    />
                    <button
                      onClick={copyLink}
                      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                        linkCopied
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {linkCopied ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-500">Generating link...</span>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Crown className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-1">
                      What can invited people do?
                    </h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• View all memories in this chapter</li>
                      <li>• Add comments, additions, and corrections to memories</li>
                      <li>• Tag people in photos and text</li>
                      <li>• Contribute their own memories to the chapter</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  onClick={() => setShowInviteForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <Users className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">
              Collaborative Chapter: "{chapterTitle}"
            </h4>
            <p className="text-sm text-blue-700">
              Invite family and friends to help build this chapter together. They can add their own memories, 
              photos, and perspectives to create a richer, more complete story.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
