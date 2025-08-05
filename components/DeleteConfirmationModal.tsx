'use client'

import { AlertTriangle, X } from 'lucide-react'

interface DeleteConfirmationModalProps {
  isOpen: boolean
  title?: string
  message?: string
  itemName: string
  itemType?: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
  showForceDelete?: boolean
  onForceDelete?: () => void
}

export default function DeleteConfirmationModal({
  isOpen,
  title,
  message,
  itemName,
  itemType = 'item',
  onConfirm,
  onCancel,
  isLoading = false,
  showForceDelete = false,
  onForceDelete
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {title || `Delete ${itemType}`}
                </h3>
                <p className="text-slate-300 text-sm">This action cannot be undone</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center space-y-4">
            {/* Warning Icon */}
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            {/* Message */}
            <div>
              <p className="text-slate-900 font-medium mb-2">
                {message || `Are you sure you want to delete`}
              </p>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <p className="font-semibold text-slate-900">"{itemName}"</p>
              </div>
            </div>

            {/* Warning text */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm font-medium flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                This action is permanent and cannot be undone
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
          {showForceDelete && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-orange-800 text-sm font-medium mb-2 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                This {itemType} has failed to delete before
              </p>
              <p className="text-orange-700 text-xs mb-3">
                This usually happens due to database sync issues. Use "Force Delete" to remove it from your view immediately.
              </p>
              <button
                onClick={onForceDelete}
                disabled={isLoading}
                className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Force Delete from View</span>
              </button>
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  <span>Try Delete Again</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}