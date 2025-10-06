'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, Crown, Loader2, Check } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'

interface MayaEnrichmentModalProps {
  isOpen: boolean
  onClose: () => void
  onContinueWithoutMaya: () => void
  memoryTitle: string
  memoryDescription: string
  isPremiumUser: boolean
  onEnrichmentComplete: (enrichedData: {
    suggestedChapter?: string
    additionalContext?: string
    enrichmentQuestions?: string[]
  }) => void
}

export default function MayaEnrichmentModal({
  isOpen,
  onClose,
  onContinueWithoutMaya,
  memoryTitle,
  memoryDescription,
  isPremiumUser,
  onEnrichmentComplete
}: MayaEnrichmentModalProps) {
  const { user } = useAuth()
  const [isEnriching, setIsEnriching] = useState(false)
  const [enrichmentData, setEnrichmentData] = useState<any>(null)
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(!isPremiumUser)

  useEffect(() => {
    if (isOpen && isPremiumUser && !enrichmentData) {
      startEnrichment()
    }
  }, [isOpen, isPremiumUser])

  const startEnrichment = async () => {
    if (!user) return
    
    setIsEnriching(true)
    try {
      const response = await fetch('/api/maya/suggest-memory-enrichment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          memory_title: memoryTitle,
          memory_description: memoryDescription
        })
      })

      const data = await response.json()
      if (data.success) {
        setEnrichmentData(data.data)
      }
    } catch (error) {
      console.error('Enrichment error:', error)
    } finally {
      setIsEnriching(false)
    }
  }

  const handleUpgradeClick = () => {
    // Trigger upgrade flow
    onClose()
  }

  const handleContinue = () => {
    if (enrichmentData) {
      onEnrichmentComplete({
        suggestedChapter: enrichmentData.enrichment?.chapter_recommendation?.title,
        additionalContext: enrichmentData.enrichment?.additional_context,
        enrichmentQuestions: enrichmentData.enrichment?.questions
      })
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex-shrink-0 bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Maya's Memory Enrichment</h2>
                <p className="text-sm text-slate-600">Let me help make this memory even richer</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto flex-1 min-h-0">
          {showUpgradePrompt ? (
            // Non-Premium User View
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-purple-200">
                  <Sparkles className="w-10 h-10 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                  Maya has questions for you! 🤔
                </h3>
                <p className="text-slate-600 text-lg leading-relaxed">
                  I can help you enrich this memory by asking thought-provoking questions, 
                  finding historical context, suggesting related chapters, and even locating 
                  relevant images and information about places you mention.
                </p>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-200">
                <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-purple-600" />
                  What Maya can do with AI Pro:
                </h4>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Ask contextual questions to uncover deeper details</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Search the web for historical context and images</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Suggest relevant chapters to organize your timeline</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Find location details and photos of places you mention</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Detect similar memories to avoid duplicates</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onContinueWithoutMaya}
                  className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                >
                  Continue Without Maya
                </button>
                <button
                  onClick={handleUpgradeClick}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Crown className="w-5 h-5" />
                  Activate Maya with Pro
                </button>
              </div>
            </div>
          ) : (
            // Premium User View - Show enrichment
            <div className="space-y-6">
              {isEnriching ? (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
                  <p className="text-slate-600">Maya is analyzing your memory...</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Searching for context, generating questions, and finding relevant information
                  </p>
                </div>
              ) : enrichmentData ? (
                <div className="space-y-6">
                  {/* Memory Summary */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <h4 className="font-semibold text-slate-900 mb-2">{memoryTitle}</h4>
                    <p className="text-sm text-slate-600">{memoryDescription}</p>
                  </div>

                  {/* Enrichment Questions */}
                  {enrichmentData.enrichment?.questions && enrichmentData.enrichment.questions.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-600" />
                        Questions to deepen this memory:
                      </h4>
                      <div className="space-y-2">
                        {enrichmentData.enrichment.questions.map((question: string, index: number) => (
                          <div key={index} className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <p className="text-slate-700">{question}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Chapter Suggestion */}
                  {enrichmentData.enrichment?.chapter_recommendation && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-slate-900 mb-2">Suggested Chapter:</h4>
                      <p className="text-slate-700">
                        {typeof enrichmentData.enrichment.chapter_recommendation === 'string'
                          ? enrichmentData.enrichment.chapter_recommendation
                          : enrichmentData.enrichment.chapter_recommendation.title}
                      </p>
                    </div>
                  )}

                  {/* Additional Context */}
                  {enrichmentData.enrichment?.additional_context && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="font-semibold text-slate-900 mb-2">Additional Context:</h4>
                      <p className="text-slate-700">{enrichmentData.enrichment.additional_context}</p>
                    </div>
                  )}

                  <p className="text-sm text-slate-500 italic text-center">
                    You can use these insights when continuing to fill in your memory details.
                  </p>
                </div>
              ) : null}

              <button
                onClick={handleContinue}
                disabled={isEnriching}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEnriching ? 'Analyzing...' : 'Continue with Memory'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
