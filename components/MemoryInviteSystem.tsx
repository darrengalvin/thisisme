'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { UserPlus, Mail, MessageCircle, Image, FileText, Eye, Send, X, Users, Sparkles, Search, Plus, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

interface MemoryInviteSystemProps {
  memoryId: string
  memoryTitle: string
  memoryDescription?: string
  memoryImageUrl?: string
  onInviteSent?: () => void
  onNavigateToMyPeople?: () => void
  className?: string
}

interface NetworkPerson {
  id: string
  person_name?: string
  person_email?: string
  relationship?: string
  photo_url?: string
}

interface InvitePermission {
  id: string
  label: string
  description: string
  icon: React.ComponentType<any>
  enabled: boolean
}

export default function MemoryInviteSystem({ 
  memoryId, 
  memoryTitle, 
  memoryDescription,
  memoryImageUrl,
  onInviteSent,
  onNavigateToMyPeople,
  className = '' 
}: MemoryInviteSystemProps) {
  const { user } = useAuth()
  const [showPickerModal, setShowPickerModal] = useState(false)
  const [people, setPeople] = useState<NetworkPerson[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPerson, setSelectedPerson] = useState<NetworkPerson | null>(null)
  const [inviteMessage, setInviteMessage] = useState('')
  const [inviteReason, setInviteReason] = useState('')
  const [permissions, setPermissions] = useState<InvitePermission[]>([
    {
      id: 'view',
      label: 'View Memory',
      description: 'Can see this memory and its content',
      icon: Eye,
      enabled: true
    },
    {
      id: 'comment',
      label: 'Add Comments',
      description: 'Can add comments, additions, and corrections',
      icon: MessageCircle,
      enabled: true
    },
    {
      id: 'text',
      label: 'Add Text Content',
      description: 'Can edit and add text descriptions',
      icon: FileText,
      enabled: false
    },
    {
      id: 'images',
      label: 'Add Images',
      description: 'Can upload and add photos to this memory',
      icon: Image,
      enabled: false
    }
  ])
  const [sending, setSending] = useState(false)

  // Fetch people from user's network
  const fetchPeople = async () => {
    if (!user) return

    setLoading(true)
    try {
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      if (!tokenResponse.ok) return

      const { token } = await tokenResponse.json()

      const response = await fetch('/api/network', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const { people } = await response.json()
        // Remove duplicates based on person_email or person_name
        const uniquePeople = people.filter((person: NetworkPerson, index: number, self: NetworkPerson[]) => 
          index === self.findIndex((p: NetworkPerson) => 
            (person.person_email && p.person_email === person.person_email) ||
            (!person.person_email && p.person_name === person.person_name)
          )
        )
        setPeople(uniquePeople)
      }
    } catch (error) {
      console.error('Failed to fetch people:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (showPickerModal) {
      fetchPeople()
    }
  }, [showPickerModal, user])

  const generateContextualMessage = () => {
    const reasons = [
      `I'm working on a memory about "${memoryTitle}" and I believe you might have some great insights or photos to add!`,
      `I'd love your help enriching this memory about "${memoryTitle}". You were there and might remember details I've forgotten.`,
      `I'm building a memory collection and "${memoryTitle}" could really benefit from your perspective and any photos you might have.`,
      `I think you'd be perfect to help me complete this memory about "${memoryTitle}". Would you like to contribute?`
    ]
    
    return reasons[Math.floor(Math.random() * reasons.length)]
  }

  const handleOpenPicker = () => {
    setShowPickerModal(true)
    setInviteMessage(generateContextualMessage())
    setSelectedPerson(null)
    setSearchQuery('')
  }

  const filteredPeople = people.filter(person =>
    (person.person_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (person.person_email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (person.relationship?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  )

  const togglePermission = (permissionId: string) => {
    setPermissions(prev => prev.map(p => 
      p.id === permissionId ? { ...p, enabled: !p.enabled } : p
    ))
  }

  const sendInvite = async () => {
    if (!user || !selectedPerson) return

    setSending(true)
    try {
      // Get JWT token
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

      // Send memory-specific invitation
      const response = await fetch('/api/memories/invite', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          memoryId,
          email: selectedPerson.person_email,
          message: inviteMessage.trim(),
          reason: inviteReason.trim(),
          permissions: permissions.filter(p => p.enabled).map(p => p.id)
        })
      })

      if (response.ok) {
        toast.success(`Invitation sent to ${selectedPerson.person_name}!`)
        setShowPickerModal(false)
        setSelectedPerson(null)
        setInviteMessage('')
        setInviteReason('')
        
        if (onInviteSent) {
          onInviteSent()
        }
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to send invitation')
      }
    } catch (error) {
      console.error('Error sending memory invitation:', error)
      toast.error('Failed to send invitation')
    } finally {
      setSending(false)
    }
  }

  if (!user) return null

  return (
    <>
      {/* People Picker Button */}
      <button
        onClick={handleOpenPicker}
        className={`flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium transition-colors duration-200 ${className}`}
      >
        <Users className="w-4 h-4" />
        <span>Involve Someone</span>
      </button>

      {/* People Picker Modal */}
      {showPickerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Involve Someone</h2>
                    <p className="text-sm text-gray-600">in "{memoryTitle}"</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPickerModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Memory Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start space-x-4">
                  {memoryImageUrl && (
                    <img
                      src={memoryImageUrl}
                      alt={memoryTitle}
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 mb-1">{memoryTitle}</h3>
                    {memoryDescription && (
                      <p className="text-sm text-gray-600 line-clamp-2">{memoryDescription}</p>
                    )}
                    <div className="flex items-center space-x-2 mt-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">Memory by {user.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* People Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search your people
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, or relationship..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* People List */}
              <div className="max-h-60 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : filteredPeople.length > 0 ? (
                  <div className="space-y-2">
                    {filteredPeople.map((person) => (
                      <div
                        key={person.id}
                        onClick={() => setSelectedPerson(person)}
                        className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                          selectedPerson?.id === person.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {person.photo_url ? (
                            <img
                              src={person.photo_url}
                              alt={person.person_name || 'Person'}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <Users className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">{person.person_name || 'Unknown'}</p>
                            <p className="text-sm text-gray-500">
                              {person.person_email || <span className="text-gray-400 italic">No email</span>}
                            </p>
                            <p className="text-xs text-gray-400">
                              {person.relationship || <span className="text-gray-400 italic">No relationship</span>}
                            </p>
                          </div>
                          {selectedPerson?.id === person.id && (
                            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No people found</p>
                    <button
                      onClick={() => {
                        setShowPickerModal(false)
                        window.location.href = '/?tab=people'
                      }}
                      className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add People to Your Network</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Add Person Button - Always Visible */}
              <div className="flex justify-center">
                <button
                  onClick={() => {
                    setShowPickerModal(false)
                    if (onNavigateToMyPeople) {
                      onNavigateToMyPeople()
                    } else {
                      window.location.href = '/?tab=people'
                    }
                  }}
                  className="inline-flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Person</span>
                </button>
              </div>

              {/* Reason for Invitation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Why are you inviting them? (optional)
                </label>
                <input
                  type="text"
                  value={inviteReason}
                  onChange={(e) => setInviteReason(e.target.value)}
                  placeholder="e.g., They were there, have photos, know the story..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Permissions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  What can they do with this memory?
                </label>
                <div className="space-y-3">
                  {permissions.map((permission) => {
                    const Icon = permission.icon
                    return (
                      <div
                        key={permission.id}
                        className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                          permission.enabled
                            ? 'border-blue-200 bg-blue-50'
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}
                        onClick={() => togglePermission(permission.id)}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className={`w-5 h-5 ${permission.enabled ? 'text-blue-600' : 'text-gray-400'}`} />
                          <div>
                            <p className={`font-medium ${permission.enabled ? 'text-blue-900' : 'text-gray-700'}`}>
                              {permission.label}
                            </p>
                            <p className={`text-sm ${permission.enabled ? 'text-blue-700' : 'text-gray-500'}`}>
                              {permission.description}
                            </p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          permission.enabled
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {permission.enabled && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Personal Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personal message
                </label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Add a personal message explaining why you'd like their help..."
                />
                <div className="flex items-center justify-between mt-2">
                  <button
                    onClick={() => setInviteMessage(generateContextualMessage())}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Generate suggestion</span>
                  </button>
                  <span className="text-xs text-gray-500">{inviteMessage.length}/500</span>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Email Preview</h4>
                <div className="text-sm text-blue-800 space-y-2">
                  <p><strong>Subject:</strong> {user.email} invited you to collaborate on a memory</p>
                  <p><strong>Message:</strong></p>
                  <div className="bg-white rounded p-3 text-gray-700">
                    <p>Hi there!</p>
                    <p className="mt-2">{inviteMessage || 'No message provided'}</p>
                    {inviteReason && (
                      <p className="mt-2"><em>Reason: {inviteReason}</em></p>
                    )}
                    <p className="mt-3">
                      <strong>You'll be able to:</strong>
                    </p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      {permissions.filter(p => p.enabled).map(p => (
                        <li key={p.id}>{p.description}</li>
                      ))}
                    </ul>
                    <p className="mt-3 text-blue-600">
                      Click here to view and contribute to "{memoryTitle}"
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => setShowPickerModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={sendInvite}
                disabled={sending || !selectedPerson}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Invite</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
