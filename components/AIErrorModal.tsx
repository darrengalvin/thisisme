'use client'

import { AlertTriangle, X, RefreshCw, MessageCircle } from 'lucide-react'

interface AIErrorModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  details?: string
  onRetry?: () => void
  onContactSupport?: () => void
}

export default function AIErrorModal({
  isOpen,
  onClose,
  title,
  message,
  details,
  onRetry,
  onContactSupport
}: AIErrorModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-auto transform transition-all">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-red-500 to-rose-600 rounded-t-xl p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="bg-white bg-opacity-20 rounded-full p-2">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{title}</h2>
              <p className="text-red-100 text-sm">Something went wrong</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Main Message */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{message}</p>
          </div>

          {/* Technical Details */}
          {details && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 font-medium mb-2">Technical Details:</p>
              <p className="text-xs text-gray-500 font-mono bg-white p-2 rounded border">
                {details}
              </p>
            </div>
          )}

          {/* Help Text */}
          <div className="text-sm text-gray-600">
            <p>This error has been automatically logged. You can:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
              <li>Try the operation again</li>
              <li>Check your internet connection</li>
              <li>Contact support if the issue persists</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3 p-6 pt-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          
          {onContactSupport && (
            <button
              onClick={onContactSupport}
              className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors flex items-center space-x-1"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Support</span>
            </button>
          )}
          
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}







