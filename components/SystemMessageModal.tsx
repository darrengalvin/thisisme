'use client'

import { useState, useEffect } from 'react'
import { X, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react'

interface SystemMessageModalProps {
  isOpen: boolean
  type?: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  actionText?: string
  onAction?: () => void
  onClose: () => void
  autoClose?: boolean
  autoCloseDelay?: number
}

export default function SystemMessageModal({
  isOpen,
  type = 'info',
  title,
  message,
  actionText,
  onAction,
  onClose,
  autoClose = false,
  autoCloseDelay = 5000
}: SystemMessageModalProps) {
  const [timeLeft, setTimeLeft] = useState(autoCloseDelay / 1000)

  useEffect(() => {
    if (!isOpen || !autoClose) return

    const timer = setTimeout(onClose, autoCloseDelay)
    
    // Countdown timer
    const countdown = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(countdown)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      clearTimeout(timer)
      clearInterval(countdown)
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose])

  useEffect(() => {
    if (isOpen) {
      setTimeLeft(autoCloseDelay / 1000)
    }
  }, [isOpen, autoCloseDelay])

  if (!isOpen) return null

  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          iconColor: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          headerBg: 'from-green-500 to-green-600',
          buttonColor: 'bg-green-600 hover:bg-green-700'
        }
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          headerBg: 'from-amber-500 to-amber-600',
          buttonColor: 'bg-amber-600 hover:bg-amber-700'
        }
      case 'error':
        return {
          icon: AlertCircle,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          headerBg: 'from-red-500 to-red-600',
          buttonColor: 'bg-red-600 hover:bg-red-700'
        }
      default:
        return {
          icon: Info,
          iconColor: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          headerBg: 'from-blue-500 to-blue-600',
          buttonColor: 'bg-blue-600 hover:bg-blue-700'
        }
    }
  }

  const config = getTypeConfig()
  const Icon = config.icon

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${config.headerBg} px-6 py-4 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold">{title}</h3>
                {autoClose && (
                  <p className="text-white/80 text-sm">Auto-closing in {timeLeft}s</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center space-y-4">
            {/* Icon */}
            <div className={`w-16 h-16 ${config.bgColor} rounded-full flex items-center justify-center mx-auto border ${config.borderColor}`}>
              <Icon className={`w-8 h-8 ${config.iconColor}`} />
            </div>

            {/* Message */}
            <div>
              <p className="text-slate-900 leading-relaxed text-center">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            {actionText && onAction ? 'Cancel' : 'Close'}
          </button>
          {onAction && actionText && (
            <button
              onClick={() => {
                onAction()
                onClose()
              }}
              className={`px-6 py-2 rounded-lg transition-colors font-medium text-white ${config.buttonColor}`}
            >
              {actionText}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
