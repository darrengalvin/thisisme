'use client'

import { AlertCircle, CheckCircle, X, AlertTriangle, Info } from 'lucide-react'

interface CustomAlertModalProps {
  isOpen: boolean
  onClose: () => void
  type?: 'error' | 'warning' | 'success' | 'info'
  title: string
  message: string
  confirmText?: string
}

export default function CustomAlertModal({ 
  isOpen, 
  onClose, 
  type = 'info',
  title,
  message,
  confirmText = 'OK'
}: CustomAlertModalProps) {
  if (!isOpen) return null

  const getIconAndColors = () => {
    switch (type) {
      case 'error':
        return {
          icon: AlertCircle,
          headerBg: 'bg-red-50 border-red-200',
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
          titleColor: 'text-red-900',
          subtitleColor: 'text-red-700'
        }
      case 'warning':
        return {
          icon: AlertTriangle,
          headerBg: 'bg-yellow-50 border-yellow-200',
          iconBg: 'bg-yellow-100',
          iconColor: 'text-yellow-600',
          titleColor: 'text-yellow-900',
          subtitleColor: 'text-yellow-700'
        }
      case 'success':
        return {
          icon: CheckCircle,
          headerBg: 'bg-green-50 border-green-200',
          iconBg: 'bg-green-100',
          iconColor: 'text-green-600',
          titleColor: 'text-green-900',
          subtitleColor: 'text-green-700'
        }
      default:
        return {
          icon: Info,
          headerBg: 'bg-blue-50 border-blue-200',
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
          titleColor: 'text-blue-900',
          subtitleColor: 'text-blue-700'
        }
    }
  }

  const { icon: Icon, headerBg, iconBg, iconColor, titleColor, subtitleColor } = getIconAndColors()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-auto">
        {/* Header */}
        <div className={`border-b px-6 py-4 rounded-t-xl ${headerBg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg}`}>
                <Icon className={`w-6 h-6 ${iconColor}`} />
              </div>
              <div>
                <h2 className={`text-lg font-bold ${titleColor}`}>{title}</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 mb-6 whitespace-pre-wrap">{message}</p>
          
          {/* Action */}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}






