'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { User, Plus, Sparkles, AtSign } from 'lucide-react'
import type { UserNetworkPerson, TagSuggestion } from '@/lib/types/collaboration'

interface TaggingInputProps {
  value: string
  onChange: (value: string) => void
  onTaggedPeopleChange?: (people: string[]) => void
  placeholder?: string
  className?: string
  rows?: number
  disabled?: boolean
}

export default function TaggingInput({
  value,
  onChange,
  onTaggedPeopleChange,
  placeholder = "Type your memory... Use @ to tag people",
  className = "",
  rows = 4,
  disabled = false
}: TaggingInputProps) {
  const { user } = useAuth()
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [currentTag, setCurrentTag] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Fetch user's network for suggestions
  useEffect(() => {
    if (user && showSuggestions) {
      fetchNetworkSuggestions()
    }
  }, [user, showSuggestions])

  const fetchNetworkSuggestions = async () => {
    if (!user) return

    try {
      // Get JWT token
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
        const tagSuggestions: TagSuggestion[] = people.map((person: UserNetworkPerson) => ({
          id: person.id,
          name: person.person_name,
          email: person.person_email,
          relationship: person.relationship,
          is_platform_user: !!person.person_user_id
        }))
        setSuggestions(tagSuggestions)
      }
    } catch (error) {
      console.error('Failed to fetch network suggestions:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const cursorPos = e.target.selectionStart || 0
    
    onChange(newValue)
    setCursorPosition(cursorPos)

    // Check for @ symbol
    const textBeforeCursor = newValue.substring(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
      
      // Check if we're still in a tag (no spaces after @)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setCurrentTag(textAfterAt)
        setShowSuggestions(true)
        setSelectedIndex(0)
      } else {
        setShowSuggestions(false)
      }
    } else {
      setShowSuggestions(false)
    }

    // Extract all tags for parent component
    if (onTaggedPeopleChange) {
      const tags = extractTags(newValue)
      onTaggedPeopleChange(tags)
    }
  }

  const extractTags = (text: string): string[] => {
    const tagRegex = /@(\w+(?:\s+\w+)*)/g
    const matches = text.match(tagRegex)
    return matches ? matches.map(tag => tag.substring(1)) : []
  }

  const handleSuggestionSelect = (suggestion: TagSuggestion) => {
    const textBeforeCursor = value.substring(0, cursorPosition)
    const textAfterCursor = value.substring(cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      const beforeAt = textBeforeCursor.substring(0, lastAtIndex)
      const newValue = beforeAt + '@' + suggestion.name + ' ' + textAfterCursor
      onChange(newValue)
      
      // Move cursor after the inserted tag
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = beforeAt.length + suggestion.name.length + 2
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
          textareaRef.current.focus()
        }
      }, 0)
    }
    
    setShowSuggestions(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return

    const filteredSuggestions = suggestions.filter(s => 
      s.name.toLowerCase().includes(currentTag.toLowerCase())
    )

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        )
        break
      case 'Enter':
      case 'Tab':
        e.preventDefault()
        if (filteredSuggestions[selectedIndex]) {
          handleSuggestionSelect(filteredSuggestions[selectedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        break
    }
  }

  const filteredSuggestions = suggestions.filter(s => 
    s.name.toLowerCase().includes(currentTag.toLowerCase())
  )

  return (
    <div className="relative">
      {/* Enhanced Textarea with Premium Styling */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className={`w-full transition-all duration-200 ${className} ${
            showSuggestions 
              ? 'ring-2 ring-blue-500 border-blue-500' 
              : 'focus:ring-2 focus:ring-slate-500 focus:border-transparent'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        
        {/* @ Symbol Indicator */}
        {showSuggestions && (
          <div className="absolute top-2 right-2 flex items-center space-x-1 bg-blue-50 text-blue-600 px-2 py-1 rounded-full text-xs font-medium">
            <AtSign size={12} />
            <span>Tagging</span>
          </div>
        )}
      </div>
      
      {/* Premium Quality Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-64 overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <AtSign size={14} className="text-blue-600" />
              <span className="text-sm font-semibold text-slate-700">Tag People</span>
              {currentTag && (
                <span className="text-xs text-slate-500">
                  searching "{currentTag}"
                </span>
              )}
            </div>
          </div>

          {/* Suggestions List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((suggestion, index) => (
                <div
                  key={suggestion.id}
                  className={`group p-4 cursor-pointer transition-all duration-150 hover:bg-slate-50 ${
                    index === selectedIndex 
                      ? 'bg-blue-50 border-l-4 border-blue-500 shadow-sm' 
                      : 'border-l-4 border-transparent'
                  }`}
                  onClick={() => handleSuggestionSelect(suggestion)}
                >
                  <div className="flex items-center space-x-3">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      suggestion.is_platform_user 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      <User size={16} />
                    </div>
                    
                    {/* Person Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <div className="font-semibold text-slate-900 truncate">
                          {suggestion.name}
                        </div>
                        {suggestion.is_platform_user && (
                          <div className="flex items-center space-x-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                            <Sparkles size={10} />
                            <span>Member</span>
                          </div>
                        )}
                      </div>
                      
                      {suggestion.email && (
                        <div className="text-sm text-slate-500 truncate">
                          {suggestion.email}
                        </div>
                      )}
                      
                      {suggestion.relationship && (
                        <div className="text-xs text-slate-400 mt-1">
                          {suggestion.relationship}
                        </div>
                      )}
                    </div>

                    {/* Selection Indicator */}
                    {index === selectedIndex && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    )}
                  </div>
                </div>
              ))
            ) : null}
            
            {/* Add New Person Option */}
            {currentTag && (
              <div
                className={`group p-4 cursor-pointer transition-all duration-150 hover:bg-slate-50 ${
                  filteredSuggestions.length > 0 ? 'border-t border-slate-100' : ''
                } ${
                  selectedIndex === filteredSuggestions.length 
                    ? 'bg-blue-50 border-l-4 border-blue-500 shadow-sm' 
                    : 'border-l-4 border-transparent'
                }`}
                onClick={() => {
                  handleSuggestionSelect({
                    id: 'new',
                    name: currentTag,
                    is_platform_user: false
                  })
                }}
              >
                <div className="flex items-center space-x-3">
                  {/* Add Icon */}
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                    <Plus size={16} className="text-blue-600" />
                  </div>
                  
                  {/* Add Person Info */}
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">
                      Add "{currentTag}"
                    </div>
                    <div className="text-sm text-slate-500">
                      Create new contact in your network
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  {selectedIndex === filteredSuggestions.length && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  )}
                </div>
              </div>
            )}
            
            {/* Empty State */}
            {!currentTag && suggestions.length === 0 && (
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User size={20} className="text-slate-400" />
                </div>
                <div className="text-sm font-medium text-slate-600 mb-1">
                  No people in your network yet
                </div>
                <div className="text-xs text-slate-400">
                  Type @ followed by a name to add someone
                </div>
              </div>
            )}
          </div>

          {/* Footer Hint */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
            <div className="text-xs text-slate-500 flex items-center justify-between">
              <span>Use ↑↓ to navigate, Enter to select</span>
              <span className="text-slate-400">ESC to close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
