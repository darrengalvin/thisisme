'use client'

import { useState, useEffect } from 'react'
import { Brain, Zap, Shield, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'

interface AIStats {
  total_analyses: number
  total_fixes_generated: number
  fixes_applied: number
  fixes_failed: number
  avg_confidence: number
  auto_applicable_fixes: number
  successful_applications: number
  rollbacks_performed: number
}

interface Ticket {
  id: string
  title: string
  description: string
  category: string
  priority: string
  status: string
  created_at: string
}

interface AIAnalysis {
  id: string
  ticket_id: string
  analysis_data: any
  confidence_score: number
  analyzed_at: string
}

interface AIFix {
  id: string
  ticket_id: string
  fix_plan: any
  confidence_score: number
  status: string
  risk_level: string
  auto_applicable: boolean
  generated_at: string
}

export default function AISupportDashboard() {
  const [stats, setStats] = useState<AIStats | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [fixes, setFixes] = useState<AIFix[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Load AI stats
      const statsResponse = await fetch('/api/admin/support/ai-stats', { credentials: 'include' })
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.stats)
      }

      // Load tickets
      const ticketsResponse = await fetch('/api/support/tickets', { credentials: 'include' })
      if (ticketsResponse.ok) {
        const ticketsData = await ticketsResponse.json()
        setTickets(ticketsData.tickets || [])
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const analyzeTicket = async (ticket: Ticket) => {
    setAnalyzing(true)
    setSelectedTicket(ticket)
    
    try {
      const response = await fetch('/api/ai/analyze-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ticketId: ticket.id })
      })

      if (response.ok) {
        const data = await response.json()
        setAnalysis(data.analysis)
      } else {
        const error = await response.json()
        alert(`Analysis failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Error analyzing ticket:', error)
      alert('Failed to analyze ticket')
    } finally {
      setAnalyzing(false)
    }
  }

  const generateFix = async (ticket: Ticket) => {
    setGenerating(true)
    
    try {
      const response = await fetch('/api/ai/generate-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          ticketId: ticket.id,
          targetFiles: analysis?.analysis_data?.CODE_LOCATION || []
        })
      })

      if (response.ok) {
        const data = await response.json()
        setFixes([...fixes, data.fixPlan])
        alert('Fix generated successfully!')
      } else {
        const error = await response.json()
        alert(`Fix generation failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Error generating fix:', error)
      alert('Failed to generate fix')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading AI Support Dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
            <Brain className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">AI Support System</h1>
          </div>
          <p className="text-gray-600">Intelligent ticket analysis and automated fix generation</p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Analyses</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_analyses}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Fixes Applied</p>
                  <p className="text-2xl font-bold text-green-600">{stats.fixes_applied}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Confidence</p>
                  <p className="text-2xl font-bold text-purple-600">{Math.round(stats.avg_confidence || 0)}%</p>
                </div>
                <Zap className="w-8 h-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Rollbacks</p>
                  <p className="text-2xl font-bold text-red-600">{stats.rollbacks_performed}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tickets List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Open Tickets</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {tickets.filter(t => t.status !== 'closed').map((ticket) => (
                  <div
                    key={ticket.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedTicket?.id === ticket.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 truncate">{ticket.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        ticket.priority === 'high' ? 'bg-red-100 text-red-800' :
                        ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{ticket.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">{ticket.category}</span>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            analyzeTicket(ticket)
                          }}
                          disabled={analyzing}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {analyzing && selectedTicket?.id === ticket.id ? 'Analyzing...' : 'Analyze'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Analysis Results */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">AI Analysis</h3>
            </div>
            <div className="p-6">
              {!selectedTicket ? (
                <div className="text-center py-8">
                  <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Select a ticket to view AI analysis</p>
                </div>
              ) : !analysis ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Click "Analyze" to generate AI insights</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Selected Ticket</h4>
                    <p className="text-sm text-gray-600">{selectedTicket.title}</p>
                  </div>

                  {analysis.analysis_data && (
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-gray-900">Root Cause</h5>
                        <p className="text-sm text-gray-600 mt-1">{analysis.analysis_data.ROOT_CAUSE}</p>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-900">Complexity</h5>
                        <div className="flex items-center mt-1">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${(analysis.analysis_data.COMPLEXITY || 0) * 10}%` }}
                            ></div>
                          </div>
                          <span className="ml-2 text-sm text-gray-600">{analysis.analysis_data.COMPLEXITY}/10</span>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-900">Suggested Approach</h5>
                        <p className="text-sm text-gray-600 mt-1">{analysis.analysis_data.SUGGESTED_APPROACH}</p>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-900">Auto-Fixable</h5>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                          analysis.analysis_data.AUTO_FIXABLE 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {analysis.analysis_data.AUTO_FIXABLE ? 'Yes' : 'No'}
                        </span>
                      </div>

                      <div className="pt-4">
                        <button
                          onClick={() => generateFix(selectedTicket)}
                          disabled={generating}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <Zap className="w-4 h-4" />
                          {generating ? 'Generating Fix...' : 'Generate AI Fix'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <Shield className="w-6 h-6 text-blue-600 mt-1 mr-4 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">AI System Status</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-blue-800">Auto-Fix:</span>
                  <span className="ml-2 text-blue-700">Enabled (Review Required)</span>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Auto-Apply:</span>
                  <span className="ml-2 text-blue-700">Disabled (Safety)</span>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Confidence Threshold:</span>
                  <span className="ml-2 text-blue-700">80%</span>
                </div>
              </div>
              <p className="text-blue-700 mt-2">
                The AI system is running in safe mode. All fixes require human review before application.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
