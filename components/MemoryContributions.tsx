'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { MessageCircle, Plus, Heart, Edit3, Trash2, Send, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import MemoryInviteSystem from './MemoryInviteSystem'

interface Contribution {
  id: string
  memory_id: string
  contributor_id: string
  contribution_type: 'COMMENT' | 'ADDITION' | 'CORRECTION'
  content: string
  created_at: string
  contributor?: {
    id: string
    email: string
  }
}

interface MemoryContributionsProps {
  memoryId: string
  memoryTitle?: string
  className?: string
  onNavigateToMyPeople?: () => void
}

export default function MemoryContributions({ 
  memoryId, 
  memoryTitle = 'this memory',
  className = '',
  onNavigateToMyPeople
}: MemoryContributionsProps) {
  const { user, session } = useAuth()
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newContribution, setNewContribution] = useState({
    type: 'COMMENT' as 'COMMENT' | 'ADDITION' | 'CORRECTION',
    content: ''
  })
  const [submitting, setSubmitting] = useState(false)

  // Load contributions
  const loadContributions = async () => {
    if (!user || !session) return

    try {
      setLoading(true)
      console.log('💬 CONTRIBUTIONS: Loading contributions for memory:', memoryId)

      // Get JWT token
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      if (!tokenResponse.ok) {
        console.error('💬 CONTRIBUTIONS: Failed to get auth token')
        return
      }

      const { token } = await tokenResponse.json()

      // Fetch contributions
      const response = await fetch(`/api/memories/${memoryId}/contributions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('💬 CONTRIBUTIONS: Loaded', data.contributions?.length || 0, 'contributions')
        setContributions(data.contributions || [])
      } else {
        console.error('💬 CONTRIBUTIONS: Failed to load contributions, status:', response.status)
      }
    } catch (error) {
      console.error('💬 CONTRIBUTIONS: Error loading contributions:', error)
    } finally {
      setLoading(false)
    }
  }

  // Submit new contribution
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !session || !newContribution.content.trim()) return

    try {
      setSubmitting(true)
      console.log('💬 CONTRIBUTIONS: Submitting contribution:', newContribution)

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

      // Submit contribution
      const response = await fetch(`/api/memories/${memoryId}/contributions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contribution_type: newContribution.type,
          content: newContribution.content.trim()
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('💬 CONTRIBUTIONS: Contribution submitted successfully')
        
        // Add to local state
        setContributions(prev => [data.contribution, ...prev])
        
        // Reset form
        setNewContribution({ type: 'COMMENT', content: '' })
        setShowAddForm(false)
        
        toast.success(`${newContribution.type.toLowerCase()} added successfully!`)
      } else {
        const errorData = await response.json()
        console.error('💬 CONTRIBUTIONS: Failed to submit contribution:', errorData)
        toast.error(errorData.error || 'Failed to add contribution')
      }
    } catch (error) {
      console.error('💬 CONTRIBUTIONS: Error submitting contribution:', error)
      toast.error('Failed to add contribution')
    } finally {
      setSubmitting(false)
    }
  }

  // Format relative time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Get contribution icon and color
  const getContributionStyle = (type: string) => {
    switch (type) {
      case 'COMMENT':
        return {
          icon: MessageCircle,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          iconColor: 'text-blue-600',
          label: 'Comment'
        }
      case 'ADDITION':
        return {
          icon: Plus,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          iconColor: 'text-green-600',
          label: 'Addition'
        }
      case 'CORRECTION':
        return {
          icon: Edit3,
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          iconColor: 'text-orange-600',
          label: 'Correction'
        }
      default:
        return {
          icon: MessageCircle,
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          iconColor: 'text-gray-600',
          label: 'Comment'
        }
    }
  }

  // Load contributions on mount
  useEffect(() => {
    loadContributions()
  }, [memoryId, user, session])

  if (!user) return null

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Contributions
          </h3>
          {contributions.length > 0 && (
            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm font-medium">
              {contributions.length}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <MemoryInviteSystem
            memoryId={memoryId}
            memoryTitle={memoryTitle}
            className="text-sm"
            onInviteSent={() => {
              // Refresh contributions after invite
              loadContributions()
            }}
            onNavigateToMyPeople={onNavigateToMyPeople}
          />
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Add Contribution Form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Contribution Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type of contribution
              </label>
              <div className="flex space-x-2">
                {(['COMMENT', 'ADDITION', 'CORRECTION'] as const).map((type) => {
                  const style = getContributionStyle(type)
                  const Icon = style.icon
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewContribution(prev => ({ ...prev, type }))}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all duration-200 ${
                        newContribution.type === type
                          ? `${style.bgColor} ${style.borderColor} ${style.iconColor}`
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{style.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {newContribution.type === 'COMMENT' && `Share your thoughts about ${memoryTitle}`}
                {newContribution.type === 'ADDITION' && `Add more details to ${memoryTitle}`}
                {newContribution.type === 'CORRECTION' && `Suggest a correction for ${memoryTitle}`}
              </label>
              <textarea
                value={newContribution.content}
                onChange={(e) => setNewContribution(prev => ({ ...prev, content: e.target.value }))}
                placeholder={
                  newContribution.type === 'COMMENT' ? 'Share your thoughts...' :
                  newContribution.type === 'ADDITION' ? 'Add more details...' :
                  'Suggest a correction...'
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                required
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setNewContribution({ type: 'COMMENT', content: '' })
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !newContribution.content.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Add {getContributionStyle(newContribution.type).label}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contributions List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-500">Loading contributions...</p>
        </div>
      ) : contributions.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">No contributions yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Be the first to add a comment, addition, or correction
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {contributions.map((contribution) => {
            const style = getContributionStyle(contribution.contribution_type)
            const Icon = style.icon
            
            return (
              <div
                key={contribution.id}
                className={`${style.bgColor} ${style.borderColor} border rounded-lg p-4`}
              >
                <div className="flex items-start space-x-3">
                  {/* Icon */}
                  <div className={`flex-shrink-0 ${style.iconColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`${style.iconColor} text-sm font-medium`}>
                        {style.label}
                      </span>
                      <span className="text-gray-400 text-sm">•</span>
                      <span className="text-gray-600 text-sm">
                        {contribution.contributor?.email || 'Unknown user'}
                      </span>
                      <span className="text-gray-400 text-sm">•</span>
                      <span className="text-gray-500 text-sm">
                        {formatTime(contribution.created_at)}
                      </span>
                    </div>
                    <p className="text-gray-800 leading-relaxed">
                      {contribution.content}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
