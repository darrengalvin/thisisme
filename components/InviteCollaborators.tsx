'use client'

import React, { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { Mail, UserPlus, Send, Copy, Check, Users, Crown } from 'lucide-react'
import toast from 'react-hot-toast'

interface InviteCollaboratorsProps {
  chapterId: string
  chapterTitle: string
  className?: string
  onInviteSent?: () => void
}

export default function InviteCollaborators({ 
  chapterId, 
  chapterTitle,
  className = '',
  onInviteSent
}: InviteCollaboratorsProps) {
  const { user, session } = useAuth()
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteMethod, setInviteMethod] = useState<'email' | 'link'>('email')
  const [emailInvites, setEmailInvites] = useState([''])
  const [inviteMessage, setInviteMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)

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

  // Send email invitations
  const sendEmailInvites = async () => {
    if (!user || !session) return

    const validEmails = emailInvites.filter(email => 
      email.trim() && email.includes('@')
    )

    if (validEmails.length === 0) {
      toast.error('Please enter at least one valid email address')
      return
    }

    try {
      setSending(true)
      console.log('📧 INVITE: Sending email invites to:', validEmails)

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

      // Send invitations
      const response = await fetch('/api/chapters/invite', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chapterId,
          emails: validEmails,
          message: inviteMessage.trim() || undefined
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('📧 INVITE: Invitations sent successfully')
        toast.success(`Invitations sent to ${validEmails.length} people!`)
        
        // Reset form
        setEmailInvites([''])
        setInviteMessage('')
        setShowInviteForm(false)
        
        if (onInviteSent) {
          onInviteSent()
        }
      } else {
        const errorData = await response.json()
        console.error('📧 INVITE: Failed to send invitations:', errorData)
        toast.error(errorData.error || 'Failed to send invitations')
      }
    } catch (error) {
      console.error('📧 INVITE: Error sending invitations:', error)
      toast.error('Failed to send invitations')
    } finally {
      setSending(false)
    }
  }

  // Add email input field
  const addEmailField = () => {
    setEmailInvites(prev => [...prev, ''])
  }

  // Remove email input field
  const removeEmailField = (index: number) => {
    setEmailInvites(prev => prev.filter((_, i) => i !== index))
  }

  // Update email at index
  const updateEmail = (index: number, value: string) => {
    setEmailInvites(prev => prev.map((email, i) => i === index ? value : email))
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
            <label className="block text-sm font-medium text-gray-700 mb-3">
              How would you like to invite people?
            </label>
            <div className="flex space-x-4">
              <button
                onClick={() => setInviteMethod('email')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
                  inviteMethod === 'email'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span className="font-medium">Send Email Invites</span>
              </button>
              <button
                onClick={() => {
                  setInviteMethod('link')
                  if (!shareLink) {
                    generateShareLink()
                  }
                }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
                  inviteMethod === 'link'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Copy className="w-4 h-4" />
                <span className="font-medium">Share Link</span>
              </button>
            </div>
          </div>

          {/* Email Invites */}
          {inviteMethod === 'email' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email addresses
                </label>
                <div className="space-y-2">
                  {emailInvites.map((email, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => updateEmail(index, e.target.value)}
                        placeholder="Enter email address"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {emailInvites.length > 1 && (
                        <button
                          onClick={() => removeEmailField(index)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={addEmailField}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  + Add another email
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personal message (optional)
                </label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder={`Hi! I'd like to invite you to collaborate on my "${chapterTitle}" chapter. You can add your own memories, photos, and comments to help build our shared story together.`}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowInviteForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={sendEmailInvites}
                  disabled={sending}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Invites</span>
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
