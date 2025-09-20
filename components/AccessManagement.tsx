'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { Shield, Users, Lock, Globe, Eye, UserCheck, AlertCircle } from 'lucide-react'

interface AccessManagementProps {
  className?: string
}

interface AccessRule {
  type: 'memory' | 'chapter'
  id: string
  title: string
  access: 'private' | 'chapter_members' | 'public'
  memberCount?: number
  members?: Array<{
    id: string
    email: string
    role: string
  }>
}

export default function AccessManagement({ className = '' }: AccessManagementProps) {
  const { user, session } = useAuth()
  const [accessRules, setAccessRules] = useState<AccessRule[]>([])
  const [loading, setLoading] = useState(false)

  // Mock data for now - in real implementation, fetch from API
  useEffect(() => {
    if (user) {
      // Simulate loading access rules
      setAccessRules([
        {
          type: 'memory',
          id: 'mem-1',
          title: 'My Wedding Day',
          access: 'private',
          memberCount: 1
        },
        {
          type: 'chapter',
          id: 'chap-1', 
          title: 'Family Vacation 2024',
          access: 'chapter_members',
          memberCount: 4,
          members: [
            { id: '1', email: 'mom@example.com', role: 'member' },
            { id: '2', email: 'dad@example.com', role: 'member' },
            { id: '3', email: 'sister@example.com', role: 'member' }
          ]
        },
        {
          type: 'memory',
          id: 'mem-2',
          title: 'Beach Trip Photos',
          access: 'chapter_members',
          memberCount: 3
        }
      ])
    }
  }, [user])

  const getAccessIcon = (access: string) => {
    switch (access) {
      case 'private':
        return <Lock className="w-4 h-4 text-red-500" />
      case 'chapter_members':
        return <Users className="w-4 h-4 text-blue-500" />
      case 'public':
        return <Globe className="w-4 h-4 text-green-500" />
      default:
        return <Shield className="w-4 h-4 text-gray-500" />
    }
  }

  const getAccessLabel = (access: string) => {
    switch (access) {
      case 'private':
        return 'Private (Only You)'
      case 'chapter_members':
        return 'Chapter Members'
      case 'public':
        return 'Public'
      default:
        return 'Unknown'
    }
  }

  const getAccessDescription = (access: string, memberCount?: number) => {
    switch (access) {
      case 'private':
        return 'Only you can see and contribute to this'
      case 'chapter_members':
        return `${memberCount || 0} people can see and contribute`
      case 'public':
        return 'Anyone with the link can see this'
      default:
        return 'Access level unknown'
    }
  }

  if (!user) return null

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Shield className="w-6 h-6 text-gray-600" />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Access Management</h2>
          <p className="text-sm text-gray-600">See who can access your memories and chapters</p>
        </div>
      </div>

      {/* Access Rules Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Lock className="w-5 h-5 text-red-600" />
            <span className="font-medium text-red-900">Private</span>
          </div>
          <p className="text-2xl font-bold text-red-900">
            {accessRules.filter(r => r.access === 'private').length}
          </p>
          <p className="text-sm text-red-700">Only you can access</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-900">Shared</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {accessRules.filter(r => r.access === 'chapter_members').length}
          </p>
          <p className="text-sm text-blue-700">Shared with chapter members</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Globe className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-900">Public</span>
          </div>
          <p className="text-2xl font-bold text-green-900">
            {accessRules.filter(r => r.access === 'public').length}
          </p>
          <p className="text-sm text-green-700">Anyone with link can access</p>
        </div>
      </div>

      {/* Detailed Access List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">Access Details</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {accessRules.map((rule) => (
            <div key={`${rule.type}-${rule.id}`} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {rule.type === 'chapter' ? (
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-blue-600 text-sm font-medium">📖</span>
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-gray-600 text-sm font-medium">💭</span>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{rule.title}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500 capitalize">{rule.type}</span>
                      <span className="text-gray-300">•</span>
                      <div className="flex items-center space-x-1">
                        {getAccessIcon(rule.access)}
                        <span className="text-xs text-gray-600">{getAccessLabel(rule.access)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm text-gray-900">{rule.memberCount || 1} {rule.memberCount === 1 ? 'person' : 'people'}</p>
                  <p className="text-xs text-gray-500">{getAccessDescription(rule.access, rule.memberCount)}</p>
                </div>
              </div>

              {/* Show members if it's a shared chapter */}
              {rule.access === 'chapter_members' && rule.members && rule.members.length > 0 && (
                <div className="mt-3 pl-11">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-700 mb-2">Chapter Members:</p>
                    <div className="space-y-1">
                      {rule.members.map((member) => (
                        <div key={member.id} className="flex items-center space-x-2">
                          <UserCheck className="w-3 h-3 text-green-500" />
                          <span className="text-xs text-gray-600">{member.email}</span>
                          <span className="text-xs text-gray-400">({member.role})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 mb-1">How Access Works</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Private memories</strong>: Only you can see and contribute</li>
              <li>• <strong>Chapter memories</strong>: All chapter members can see and contribute</li>
              <li>• <strong>Inviting people</strong>: Add them to chapters to give access to all memories in that chapter</li>
              <li>• <strong>Contributions</strong>: Anyone with access can add comments, additions, and corrections</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
