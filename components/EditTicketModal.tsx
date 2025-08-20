'use client'

import { useState, useEffect } from 'react'
import { X, Upload, Image as ImageIcon, AlertCircle, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface Ticket {
  id: string
  title: string
  description: string
  category: 'bug' | 'feature' | 'question' | 'improvement'
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: string
  screenshot_url?: string
  metadata?: {
    has_screenshot?: boolean
    screenshot_url?: string
    visual_context?: string
  }
}

interface EditTicketModalProps {
  ticket: Ticket | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function EditTicketModal({ ticket, isOpen, onClose, onSuccess }: EditTicketModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<'bug' | 'feature' | 'question' | 'improvement'>('bug')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [existingScreenshot, setExistingScreenshot] = useState<string | null>(null)
  const [removeExistingScreenshot, setRemoveExistingScreenshot] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Populate form when ticket changes
  useEffect(() => {
    if (ticket && isOpen) {
      setTitle(ticket.title)
      setDescription(ticket.description)
      setCategory(ticket.category)
      setPriority(ticket.priority)
      setExistingScreenshot(ticket.screenshot_url || null)
      setScreenshot(null)
      setScreenshotPreview(null)
      setRemoveExistingScreenshot(false)
    }
  }, [ticket, isOpen])

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('Screenshot must be less than 10MB')
        return
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file')
        return
      }

      setScreenshot(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setScreenshotPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeNewScreenshot = () => {
    setScreenshot(null)
    setScreenshotPreview(null)
  }

  const removeExistingScreenshotHandler = () => {
    setRemoveExistingScreenshot(true)
    setExistingScreenshot(null)
  }

  const restoreExistingScreenshot = () => {
    setRemoveExistingScreenshot(false)
    setExistingScreenshot(ticket?.screenshot_url || null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!ticket || !title.trim() || !description.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)

    try {
      let finalScreenshotUrl = existingScreenshot

      // Handle screenshot changes
      if (removeExistingScreenshot) {
        finalScreenshotUrl = null
      }

      if (screenshot) {
        // Upload new screenshot
        const formData = new FormData()
        formData.append('file', screenshot)
        formData.append('type', 'ticket-screenshot')

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json()
          finalScreenshotUrl = uploadData.url
        } else {
          console.warn('Screenshot upload failed, keeping existing')
        }
      }

      // Update ticket
      const response = await fetch(`/api/support/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          priority,
          screenshot_url: finalScreenshotUrl,
          metadata: {
            ...ticket.metadata,
            has_screenshot: !!finalScreenshotUrl,
            screenshot_url: finalScreenshotUrl,
            visual_context: finalScreenshotUrl ? 'Screenshot provided for visual AI analysis' : null,
            last_updated: new Date().toISOString()
          }
        })
      })

      if (response.ok) {
        toast.success('Ticket updated successfully!')
        onSuccess()
        onClose()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to update ticket')
      }
    } catch (error) {
      console.error('Error updating ticket:', error)
      toast.error('Failed to update ticket')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !ticket) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-auto max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Edit Ticket</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isSubmitting}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description of the issue"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Category & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-category" className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  id="edit-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                >
                  <option value="bug">🐛 Bug</option>
                  <option value="feature">✨ Feature Request</option>
                  <option value="question">❓ Question</option>
                  <option value="improvement">🔧 Improvement</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="edit-priority" className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  id="edit-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isSubmitting}
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🟠 High</option>
                  <option value="critical">🔴 Critical</option>
                </select>
              </div>
            </div>

            {/* Screenshot Management */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Screenshot
              </label>
              <div className="space-y-3">
                
                {/* Existing Screenshot */}
                {existingScreenshot && !removeExistingScreenshot && (
                  <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <ImageIcon className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">Current Screenshot</span>
                      </div>
                      <button
                        type="button"
                        onClick={removeExistingScreenshotHandler}
                        className="text-red-600 hover:text-red-700 text-sm flex items-center space-x-1"
                        disabled={isSubmitting}
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                    <img
                      src={existingScreenshot}
                      alt="Current screenshot"
                      className="max-w-full h-auto max-h-48 object-contain rounded border"
                    />
                  </div>
                )}

                {/* Removed Screenshot Notice */}
                {removeExistingScreenshot && (
                  <div className="border border-red-200 rounded-lg p-3 bg-red-50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-red-800">Screenshot will be removed</span>
                      <button
                        type="button"
                        onClick={restoreExistingScreenshot}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                        disabled={isSubmitting}
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                )}

                {/* New Screenshot Upload */}
                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {existingScreenshot ? 'Replace Screenshot' : 'Upload Screenshot'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                      className="hidden"
                      disabled={isSubmitting}
                    />
                  </label>
                  {screenshot && (
                    <button
                      type="button"
                      onClick={removeNewScreenshot}
                      className="text-red-600 hover:text-red-700 text-sm"
                      disabled={isSubmitting}
                    >
                      Remove New
                    </button>
                  )}
                </div>

                {/* New Screenshot Preview */}
                {screenshotPreview && (
                  <div className="border border-green-200 rounded-lg p-3 bg-green-50">
                    <div className="flex items-center space-x-2 mb-2">
                      <ImageIcon className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">New Screenshot</span>
                    </div>
                    <img
                      src={screenshotPreview}
                      alt="New screenshot preview"
                      className="max-w-full h-auto max-h-48 object-contain rounded border"
                    />
                  </div>
                )}

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">AI Analysis Enhancement</p>
                      <p>Adding a screenshot helps our AI system identify exactly which UI component has the issue, leading to more accurate fixes.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Detailed description of the issue, steps to reproduce, expected vs actual behavior..."
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}








