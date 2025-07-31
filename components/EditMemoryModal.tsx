'use client'

import { useState, useEffect } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { MemoryWithRelations } from '@/lib/types'
import toast from 'react-hot-toast'

interface EditMemoryModalProps {
  memory: MemoryWithRelations | null
  isOpen: boolean
  onClose: () => void
  onSave: (updatedMemory: MemoryWithRelations) => void
}

export default function EditMemoryModal({ memory, isOpen, onClose, onSave }: EditMemoryModalProps) {
  const [title, setTitle] = useState('')
  const [textContent, setTextContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (memory) {
      setTitle(memory.title || '')
      setTextContent(memory.textContent || '')
    }
  }, [memory])

  const handleSave = async () => {
    if (!memory) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/memories/${memory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          title: title.trim() || null,
          textContent: textContent.trim() || null
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Memory updated successfully!')
        onSave(data.memory)
        onClose()
      } else {
        toast.error(data.error || 'Failed to update memory')
      }
    } catch (error) {
      console.error('Update memory error:', error)
      toast.error('Failed to update memory')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (isLoading) return
    onClose()
  }

  if (!isOpen || !memory) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Edit Memory</h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your memory a title..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
              disabled={isLoading}
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Describe your memory..."
              rows={5}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none"
              disabled={isLoading}
            />
          </div>

          {/* Media preview (read-only) */}
          {memory.media && memory.media.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Media ({memory.media.length} files)
              </label>
              <div className="flex flex-wrap gap-2">
                {memory.media.slice(0, 3).map((media) => (
                  <div key={media.id} className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden">
                    {media.type === 'IMAGE' ? (
                      <img
                        src={media.thumbnail_url || media.storage_url}
                        alt="Memory media"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-200">
                        <span className="text-xs text-slate-500">
                          {media.type === 'VIDEO' ? '🎥' : '🎵'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                {memory.media.length > 3 && (
                  <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center">
                    <span className="text-xs text-slate-500">+{memory.media.length - 3}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Media files cannot be edited. Create a new memory to add different files.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-200 bg-slate-50">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}