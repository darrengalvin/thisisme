'use client'

import React, { useState, useEffect } from 'react'
import { Tag } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'

interface PhotoTag {
  id: string
  media_id: string
  tagged_person_id: string
  tagged_person_name: string
  x_position: number
  y_position: number
  tag_width?: number
  tag_height?: number
  created_at: string
}

interface PhotoTagDisplayProps {
  mediaId: string
  imageUrl: string
  className?: string
  showTagsOnHover?: boolean
  showTagIndicator?: boolean
  onPersonClick?: (personId: string, personName: string) => void
  onTagNowClick?: (mediaId: string) => void
}

export default function PhotoTagDisplay({ 
  mediaId, 
  imageUrl, 
  className = '', 
  showTagsOnHover = true,
  showTagIndicator = true,
  onPersonClick,
  onTagNowClick
}: PhotoTagDisplayProps) {
  const [tags, setTags] = useState<PhotoTag[]>([])
  const [loading, setLoading] = useState(true)
  const [showTags, setShowTags] = useState(!showTagsOnHover)
  const { user, session } = useAuth()

  const loadPhotoTags = async () => {
    try {
      console.log('🏷️ PHOTO TAG DISPLAY: loadPhotoTags called for media:', mediaId, 'user available:', !!user)
      
      if (!user) {
        console.log('🏷️ PHOTO TAG DISPLAY: No user found, skipping API call')
        setLoading(false)
        return
      }

      if (!mediaId) {
        console.log('🏷️ PHOTO TAG DISPLAY: No mediaId provided')
        setLoading(false)
        return
      }

      console.log('🏷️ PHOTO TAG DISPLAY: Loading tags for media:', mediaId)

      // Get custom JWT token for API (same pattern as Dashboard)
      const tokenResponse = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })

      if (!tokenResponse.ok) {
        console.log('🏷️ PHOTO TAG DISPLAY: Failed to get auth token, status:', tokenResponse.status)
        setLoading(false)
        return
      }

      const { token } = await tokenResponse.json()
      console.log('🏷️ PHOTO TAG DISPLAY: Got auth token, loading tags...')
      
      const response = await fetch(`/api/media/${mediaId}/photo-tags`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      console.log('🏷️ PHOTO TAG DISPLAY: Response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('🏷️ PHOTO TAG DISPLAY: Loaded tags:', data.tags)
        setTags(data.tags || [])
      } else {
        console.log('🏷️ PHOTO TAG DISPLAY: Failed to load tags, status:', response.status)
        const errorText = await response.text()
        console.log('🏷️ PHOTO TAG DISPLAY: Error response:', errorText)
      }
    } catch (error) {
      console.error('🏷️ PHOTO TAG DISPLAY: Error loading tags:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load tags when component mounts or dependencies change
  useEffect(() => {
    console.log('🏷️ PHOTO TAG DISPLAY: Effect running with deps:', { mediaId: !!mediaId, user: !!user, session: !!session })
    
    if (mediaId && user && session) {
      console.log('🏷️ PHOTO TAG DISPLAY: Conditions met, calling loadPhotoTags')
      loadPhotoTags()
    }
  }, [mediaId, user, session]) // Proper dependency array

  const handlePersonClick = (personId: string, personName: string) => {
    console.log('🏷️ PHOTO TAG DISPLAY: Person clicked:', personName, personId)
    if (onPersonClick) {
      onPersonClick(personId, personName)
    }
  }

  const handleMouseEnter = () => {
    if (showTagsOnHover) {
      setShowTags(true)
    }
  }

  const handleMouseLeave = () => {
    if (showTagsOnHover) {
      setShowTags(false)
    }
  }

  const hasPhotos = tags.length > 0

      return (
        <div className="space-y-2">
          <div 
            className={`relative ${className}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Main Image */}
            <img 
              src={imageUrl} 
              alt="Memory" 
              className="w-full h-full object-cover"
            />

      {/* Tag Indicator */}
      {showTagIndicator && hasPhotos && (
        <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-medium shadow-lg">
          <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
          </svg>
          {tags.length}
        </div>
      )}

      {/* Photo Tags */}
      {showTags && tags.map((tag) => (
        <div
          key={tag.id}
          className="absolute cursor-pointer z-10"
          style={{
            left: `${tag.x_position}%`,
            top: `${tag.y_position}%`,
            transform: 'translate(-50%, -50%)',
            width: `${tag.tag_width || 10}%`,
            height: `${tag.tag_height || 10}%`,
            minWidth: '24px',
            minHeight: '24px'
          }}
          onClick={(e) => {
            e.stopPropagation()
            handlePersonClick(tag.tagged_person_id, tag.tagged_person_name)
          }}
        >
          {/* Tag Circle */}
          <div className="relative w-full h-full group">
            {/* Outer Ring */}
            <div className="absolute inset-0 border-2 border-white rounded-full shadow-lg bg-blue-600 bg-opacity-30 group-hover:bg-opacity-50 transition-all duration-200"></div>
            
            {/* Center Dot */}
            <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-blue-600 rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-md group-hover:scale-110 transition-transform duration-200"></div>
            
            {/* Name Label */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-xl whitespace-nowrap border border-gray-700">
                <div className="flex items-center space-x-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  <span>{tag.tagged_person_name}</span>
                </div>
                {/* Arrow pointer */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
              </div>
            </div>
          </div>
        </div>
      ))}

          {/* Loading Indicator */}
          {loading && hasPhotos && (
            <div className="absolute top-2 right-2 bg-gray-600 text-white px-2 py-1 rounded-full text-xs">
              Loading tags...
            </div>
          )}
          </div>

          {/* Tagged People Text Below Image */}
          {!loading && (
            <div className="text-sm text-slate-600 px-2">
              {hasPhotos ? (
                <>
                  <span className="font-medium">Tagged in this image:</span>{' '}
                  {tags.map((tag, index) => (
                    <span key={tag.id}>
                      <button
                        onClick={() => handlePersonClick(tag.tagged_person_id, tag.tagged_person_name)}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      >
                        {tag.tagged_person_name}
                      </button>
                      {index < tags.length - 1 && ', '}
                    </span>
                  ))}
                </>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500 italic">Tagged in this pic: No one</span>
                  <button 
                    type="button"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium cursor-pointer transition-colors flex items-center space-x-1 shadow-sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      console.log('🏷️ Opening photo tagger')
                      if (onTagNowClick) {
                        onTagNowClick(mediaId)
                      } else {
                        console.error('onTagNowClick handler not provided')
                      }
                    }}
                  >
                    <Tag size={14} />
                    <span>Tag People</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )
    }
