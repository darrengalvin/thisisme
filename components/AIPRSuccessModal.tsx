'use client'

import { ExternalLink, GitBranch, Shield, X, CheckCircle } from 'lucide-react'

interface AIPRSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  prData: {
    number: number
    url: string
    title: string
    branch: string
  }
  safetyScore: number
  riskLevel: string
}

export default function AIPRSuccessModal({ 
  isOpen, 
  onClose, 
  prData, 
  safetyScore, 
  riskLevel 
}: AIPRSuccessModalProps) {
  if (!isOpen) return null

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-auto">
        {/* Header */}
        <div className="bg-green-50 border-b border-green-200 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-green-900">🎉 AI Fix Created!</h2>
                <p className="text-sm text-green-700">Pull request successfully generated</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-green-400 hover:text-green-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* PR Details */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <GitBranch className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <p className="font-medium text-blue-900">PR #{prData.number}</p>
                <p className="text-sm text-blue-700 truncate">{prData.title}</p>
              </div>
            </div>

            {/* Safety Score */}
            <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">Safety Score</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`text-xl font-bold ${getScoreColor(safetyScore)}`}>
                  {safetyScore}/10
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRiskColor(riskLevel)}`}>
                  {riskLevel.toUpperCase()} RISK
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                window.open(prData.url, '_blank')
                onClose()
              }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View PR</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}