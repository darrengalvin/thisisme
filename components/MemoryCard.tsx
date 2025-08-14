'use client'

import { useState } from 'react'
import { Edit2, Trash2, Play, Pause, Download } from 'lucide-react'
import { MemoryCardProps } from '@/lib/types'
import { formatRelativeTime, truncateText } from '@/lib/utils'

export default function MemoryCard({ memory, showActions = false, onEdit, onDelete }: MemoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)

  const handlePlayAudio = (audioUrl: string) => {
    if (playingAudio === audioUrl) {
      setPlayingAudio(null)
      // Stop audio
    } else {
      setPlayingAudio(audioUrl)
      // Play audio
    }
  }

  const renderMedia = () => {
    if (!memory.media || memory.media.length === 0) return null

    return (
      <div className="mt-3 space-y-2">
        {memory.media.map((media) => {
          switch (media.type) {
            case 'IMAGE':
              return (
                <div key={media.id} className="media-container group">
                  <img
                    src={media.storage_url}
                    alt="Memory"
                    className="w-full h-auto object-contain transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  {media.thumbnail_url && (
                    <div className="absolute inset-0 bg-gray-200 rounded-2xl">
                      <img
                        src={media.thumbnail_url}
                        alt="Thumbnail"
                        className="w-full h-full object-cover rounded-2xl blur-sm"
                      />
                    </div>
                  )}
                </div>
              )
            case 'VIDEO':
              return (
                <div key={media.id} className="media-container aspect-video group">
                  <video
                    src={media.storage_url}
                    controls
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    poster={media.thumbnail_url || undefined}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              )
            case 'AUDIO':
              return (
                <div key={media.id} className="flex items-center space-x-4 p-4 bg-primary-50 rounded-2xl border border-primary-200/50">
                  <button
                    onClick={() => handlePlayAudio(media.storage_url)}
                                         className="p-4 bg-primary-600 text-white rounded-2xl hover:bg-primary-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    {playingAudio === media.storage_url ? (
                      <Pause size={20} />
                    ) : (
                      <Play size={20} />
                    )}
                  </button>
                  <div className="flex-1">
                    <p className="text-base font-semibold text-gray-900">{media.file_name}</p>
                    <p className="text-sm text-gray-600">Audio recording</p>
                  </div>
                  <a
                    href={media.storage_url}
                    download={media.file_name}
                    className="p-3 text-gray-500 hover:text-primary-600 hover:bg-primary-100 rounded-xl transition-all duration-200"
                  >
                    <Download size={18} />
                  </a>
                </div>
              )
            default:
              return null
          }
        })}
      </div>
    )
  }

  const textContent = memory.textContent || ''
  const shouldTruncate = textContent.length > 200 && !isExpanded

  return (
    <article className="card-elevated p-6 lg:p-8 transform hover:scale-[1.02] transition-all duration-300">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          {memory.title && (
            <h3 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2 leading-tight">
              {memory.title}
            </h3>
          )}
          <div className="flex items-center space-x-3 text-sm">
            <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full font-medium">
              {formatRelativeTime(memory.createdAt)}
            </span>
            {memory.timeZone && (
              <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full font-medium">
                {memory.timeZone.title}
              </span>
            )}
          </div>
        </div>

        {showActions && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEdit?.(memory)}
              className="p-3 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200"
              title="Edit memory"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={() => onDelete?.(memory)}
              className="p-3 text-gray-500 hover:text-danger-600 hover:bg-danger-50 rounded-xl transition-all duration-200"
              title="Delete memory"
            >
              <Trash2 size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {textContent && (
        <div className="mb-6">
          <div className="memory-text text-base lg:text-lg">
            {shouldTruncate ? truncateText(textContent) : textContent}
          </div>
          {textContent.length > 200 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-3 btn-ghost text-primary-600 hover:text-primary-700 font-semibold"
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Media */}
      {renderMedia()}
    </article>
  )
} 