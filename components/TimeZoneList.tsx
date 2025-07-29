'use client'

import { useState, useEffect } from 'react'
import { Plus, Users, Lock, Settings } from 'lucide-react'
import { TimeZoneWithRelations } from '@/lib/types'
import TimeZoneCard from './TimeZoneCard'
import CreateTimeZone from './CreateTimeZone'

export default function TimeZoneList() {
  const [timeZones, setTimeZones] = useState<TimeZoneWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    fetchTimeZones()
  }, [])

  const fetchTimeZones = async () => {
    try {
      const response = await fetch('/api/timezones', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTimeZones(data.data || [])
      } else {
        setError('Failed to load time zones')
      }
    } catch (error) {
      setError('Something went wrong while loading time zones')
    } finally {
      setIsLoading(false)
    }
  }

  const getAuthToken = () => {
    const cookies = document.cookie.split(';')
    const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth-token='))
    return authCookie ? authCookie.split('=')[1] : ''
  }

  const handleTimeZoneCreated = () => {
    // Refresh the time zones list
    fetchTimeZones()
    setShowCreateForm(false)
  }

  const handleSelectTimeZone = (timeZone: TimeZoneWithRelations) => {
    // TODO: Navigate to time zone details or memories
    console.log('Selected time zone:', timeZone)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading time zones...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button 
            onClick={fetchTimeZones}
            className="mt-2 btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (showCreateForm) {
    return (
      <CreateTimeZone
        onSuccess={handleTimeZoneCreated}
        onCancel={() => setShowCreateForm(false)}
      />
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Time Zones</h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Create</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {timeZones.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-600">
              <p className="text-lg">No time zones yet</p>
              <p className="text-sm mt-1">Create your first time zone to organize your memories!</p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {timeZones.map((timeZone) => (
              <TimeZoneCard
                key={timeZone.id}
                timeZone={timeZone}
                onSelect={handleSelectTimeZone}
                showMembers={true}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 