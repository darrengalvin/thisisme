'use client'

import { Users, Lock, Calendar } from 'lucide-react'
import { TimeZoneCardProps } from '@/lib/types'
import { formatRelativeTime } from '@/lib/utils'

export default function TimeZoneCard({ timeZone, onSelect, showMembers = false }: TimeZoneCardProps) {
  const isPrivate = timeZone.type === 'PRIVATE'
  const memberCount = timeZone._count?.members || 0
  const memoryCount = timeZone._count?.memories || 0

  return (
    <div 
      className="card p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onSelect?.(timeZone)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {timeZone.title}
            </h3>
            {isPrivate ? (
              <Lock size={16} className="text-gray-500" />
            ) : (
              <Users size={16} className="text-primary-600" />
            )}
          </div>
          
          {timeZone.description && (
            <p className="text-gray-600 text-sm mb-3">
              {timeZone.description}
            </p>
          )}

          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Calendar size={14} />
              <span>{formatRelativeTime(timeZone.createdAt)}</span>
            </div>
            
            {showMembers && !isPrivate && (
              <div className="flex items-center space-x-1">
                <Users size={14} />
                <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
              </div>
            )}
            
            <span>{memoryCount} memor{memoryCount !== 1 ? 'ies' : 'y'}</span>
          </div>
        </div>
      </div>

      {timeZone.type === 'GROUP' && timeZone.members && timeZone.members.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">Members:</span>
            <div className="flex -space-x-1">
              {timeZone.members.slice(0, 3).map((member, index) => (
                <div
                  key={member.id}
                  className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-xs font-medium text-primary-800 border border-white"
                >
                  {member.userId.charAt(0).toUpperCase()}
                </div>
              ))}
              {timeZone.members.length > 3 && (
                <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 border border-white">
                  +{timeZone.members.length - 3}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 