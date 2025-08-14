'use client'

import { useState, useEffect } from 'react'
import { Brain, Zap, Shield, TrendingUp, AlertTriangle, CheckCircle, Github, ExternalLink, GitBranch, GitPullRequest } from 'lucide-react'
import AIPRSuccessModal from '@/components/AIPRSuccessModal'
import CustomAlertModal from '@/components/CustomAlertModal'

interface GitHubConnection {
  connected: boolean
  username?: string
  error?: string
  needsReauth?: boolean
  repositories?: Array<{
    id: number
    name: string
    full_name: string
    owner: string
    default_branch: string
    url: string
    language?: string
    private: boolean
    permissions?: {
      admin: boolean
      maintain: boolean
      push: boolean
      triage: boolean
      pull: boolean
    }
  }>
  stats?: {
    totalRepositories: number
    privateRepos: number
    publicRepos: number
    writableRepos: number
    languages: Record<string, number>
  }
  rateLimit?: {
    limit: number
    remaining: number
    reset: number
  }
  lastValidated?: string
}

interface AIAnalysis {
  id: string
  ticket_id: string
  repository: string
  files_analyzed: string[]
  analysis_data: {
    rootCause: string
    complexity: number
    confidence: number
    isAutoFixable: boolean
    suggestedFix: {
      description: string
      codeChanges?: Array<{
        file: string
        explanation: string
      }>
    }
    risks?: string[]
    testingRequired?: string[]
  }
  confidence_score: number
  complexity_score: number
  is_auto_fixable: boolean
  analyzed_at: string
}

interface AIFix {
  id: string
  analysis_id: string
  ticket_id: string
  pr_number: number
  pr_url: string
  branch_name: string
  files_changed: string[]
  status: 'pending_review' | 'approved' | 'merged' | 'rejected'
  created_at: string
}

interface Ticket {
  id: string
  title: string
  description: string
  category: string
  priority: string
  status: string
  created_at: string
  metadata?: {
    ai_pr_url?: string
    ai_pr_number?: number
  }
}

export default function AISupportDashboard() {
  const [githubConnection, setGithubConnection] = useState<GitHubConnection>({ connected: false })
  const [selectedRepo, setSelectedRepo] = useState<string>('')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [fixes, setFixes] = useState<AIFix[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [creatingPR, setCreatingPR] = useState(false)
  const [prProgress, setPrProgress] = useState({ step: '', progress: 0, details: '' })
  const [prAbortController, setPrAbortController] = useState<AbortController | null>(null)
  
  // Modal states
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean
    prData?: any
    safetyScore?: number
    riskLevel?: string
  }>({ isOpen: false })
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean
    type?: 'error' | 'warning' | 'success' | 'info'
    title?: string
    message?: string
  }>({ isOpen: false })

  useEffect(() => {
    loadDashboardData()
    checkGitHubConnection()
    
    // Check for GitHub OAuth success/error in URL params
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('github') === 'connected') {
      // GitHub connection successful, refresh status
      setTimeout(() => {
        checkGitHubConnection()
        // Clean up URL parameters
        window.history.replaceState({}, document.title, window.location.pathname)
      }, 1000)
    }
  }, [])

  const checkGitHubConnection = async (refresh = false) => {
    try {
      // Use refresh parameter to force fresh data
      const url = refresh ? '/api/github/status?refresh=true' : '/api/github/status'
      const response = await fetch(url, { 
        credentials: 'include',
        cache: refresh ? 'no-cache' : 'default'
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('GitHub connection status:', data)
        
        setGithubConnection({
          connected: data.connected,
          username: data.user?.login,
          repositories: data.repositories || [],
          stats: data.stats,
          rateLimit: data.rateLimit,
          lastValidated: data.lastValidated
        })
        
        if (data.repositories && data.repositories.length > 0) {
          // Select the first writable repository if possible
          const writableRepo = data.repositories.find((r: any) => 
            r.permissions?.admin || r.permissions?.maintain || r.permissions?.push
          )
          setSelectedRepo((writableRepo || data.repositories[0]).full_name)
        }
      } else {
        const errorData = await response.json()
        console.error('GitHub connection check failed:', errorData)
        
        setGithubConnection({
          connected: false,
          error: errorData.error,
          needsReauth: errorData.needsReauth
        })
      }
    } catch (error) {
      console.error('Error checking GitHub connection:', error)
      setGithubConnection({
        connected: false,
        error: 'Network error checking connection'
      })
    }
  }

  const loadDashboardData = async () => {
    try {
      // Load tickets
      const ticketsResponse = await fetch('/api/support/tickets', { credentials: 'include' })
      if (ticketsResponse.ok) {
        const ticketsData = await ticketsResponse.json()
        setTickets(ticketsData.tickets || [])
      }

      // Load existing analyses and fixes
      const analysesResponse = await fetch('/api/ai/analyses', { credentials: 'include' })
      if (analysesResponse.ok) {
        const analysesData = await analysesResponse.json()
        if (analysesData.fixes) {
          setFixes(analysesData.fixes)
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const connectGitHub = () => {
    window.location.href = '/api/github/auth?action=connect'
  }

  const analyzeTicket = async (ticket: Ticket) => {
    if (!selectedRepo) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Repository Required',
        message: 'Please select a repository first before analyzing tickets.'
      })
      return
    }

    // Check if selected repository has write permissions
    const selectedRepoData = githubConnection.repositories?.find(r => r.full_name === selectedRepo)
    if (selectedRepoData && !selectedRepoData.permissions?.push && !selectedRepoData.permissions?.maintain && !selectedRepoData.permissions?.admin) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Limited Repository Permissions',
        message: 'You do not have write permissions for this repository. Analysis will proceed but fix PRs may fail.'
      })
    }

    setAnalyzing(true)
    setSelectedTicket(ticket)
    setAnalysis(null)
    
    try {
      console.log(`Starting analysis for ticket ${ticket.id} in repository ${selectedRepo}`)
      
      // First, analyze the repository codebase if we haven't already
      let codebaseAnalysis = null
      try {
        console.log('Analyzing repository codebase...')
        const codebaseResponse = await fetch(`/api/github/status?analyze=${encodeURIComponent(selectedRepo)}`, {
          credentials: 'include'
        })
        
        if (codebaseResponse.ok) {
          const codebaseData = await codebaseResponse.json()
          codebaseAnalysis = codebaseData.codebaseAnalysis
          console.log('Codebase analysis completed:', codebaseAnalysis)
        }
      } catch (error) {
        console.warn('Codebase analysis failed, proceeding without it:', error)
      }

      // Now analyze the ticket with codebase context
      const response = await fetch('/api/ai/analyze-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          ticketId: ticket.id,
          repository: selectedRepo,
          title: ticket.title,
          description: ticket.description,
          category: ticket.category,
          codebaseContext: codebaseAnalysis
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAnalysis(data.analysis)
        console.log('Ticket analysis completed successfully')
      } else {
        const error = await response.json()
        console.error('Analysis failed:', error)
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'Analysis Failed',
          message: `Analysis failed: ${error.error}`
        })
      }
    } catch (error) {
      console.error('Error analyzing ticket:', error)
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'Analysis Error',
        message: 'Failed to analyze ticket. Please try again.'
      })
    } finally {
      setAnalyzing(false)
    }
  }

  const createFixPR = async () => {
    if (!analysis) {
      setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Analysis Required',
        message: 'Please analyze the ticket first before creating a fix PR.'
      })
      return
    }

    setCreatingPR(true)
    setPrProgress({ step: 'Initializing AI fix generation...', progress: 5, details: 'Setting up secure environment' })
    
    // Create abort controller for cancellation
    const abortController = new AbortController()
    setPrAbortController(abortController)
    
    try {
      // Simulate progress updates for better UX
      const progressUpdates = [
        { step: 'Creating secure branch...', progress: 15, details: 'Generating unique branch name' },
        { step: 'Analyzing code files...', progress: 25, details: 'Reading current implementation' },
        { step: 'Generating fix with Claude AI...', progress: 40, details: 'Creating code modifications' },
        { step: 'Running AI code review...', progress: 60, details: 'Validating security and quality' },
        { step: 'Generating test cases...', progress: 75, details: 'Creating automated tests' },
        { step: 'Creating GitHub PR...', progress: 90, details: 'Finalizing pull request' }
      ]

      // Start progress simulation
      let currentStep = 0
      const progressInterval = setInterval(() => {
        if (currentStep < progressUpdates.length) {
          setPrProgress(progressUpdates[currentStep])
          currentStep++
        }
      }, 2000) // Update every 2 seconds

      const response = await fetch('/api/ai/create-fix-pr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: abortController.signal,
        body: JSON.stringify({ 
          analysisId: analysis.id,
          autoApply: false
        })
      })

      clearInterval(progressInterval)
      setPrProgress({ step: 'Completing...', progress: 95, details: 'Processing results' })

      if (response.ok) {
        const data = await response.json()
        
        // Show detailed validation results
        const validation = data.validation
        const riskLevel = validation?.riskAssessment?.level || 'unknown'
        const score = validation?.riskAssessment?.score || 0
        const approved = validation?.riskAssessment?.approved
        
        const riskEmoji = riskLevel === 'low' ? '🟢' : riskLevel === 'medium' ? '🟡' : '🔴'
        const approvedEmoji = approved ? '✅' : '❌'
        
        const message = `🤖 AI Fix PR Created Successfully!

PR #${data.pr.number}: ${data.pr.url}

🛡️ SAFETY VALIDATION:
${approvedEmoji} AI Approved: ${approved ? 'Yes' : 'No'}
⭐ Quality Score: ${score}/10
${riskEmoji} Risk Level: ${riskLevel.toUpperCase()}
🔒 Security Issues: ${validation?.riskAssessment?.securityIssues || 0}
⚡ Performance Issues: ${validation?.riskAssessment?.performanceIssues || 0}

💡 RECOMMENDATIONS:
${validation?.recommendations?.autoMerge ? '✅ Safe for auto-merge' : '⚠️ Manual review required'}
${validation?.recommendations?.stagingTestRequired ? '🧪 Test in staging before merge' : ''}

${validation?.testGeneration ? '🧪 Automated tests generated' : '📝 Manual testing required'}

${!approved ? '⚠️ ATTENTION: AI flagged potential issues - please review carefully!' : ''}
        `
        
        // Show success in a better way than alert
        setPrProgress({ 
          step: '✅ Pull Request Created Successfully!', 
          progress: 100, 
          details: `PR #${data.pr.number} created with ${validation?.recommendations?.autoMerge ? 'low risk' : 'review required'}` 
        })
        
        // Show custom success modal
        setTimeout(() => {
          setSuccessModal({
            isOpen: true,
            prData: {
              number: data.pr.number,
              url: data.pr.url,
              title: data.pr.title || `AI Fix for: ${selectedTicket?.title}`,
              branch: data.pr.head?.ref || 'ai-fix-branch'
            },
            safetyScore: score,
            riskLevel: riskLevel
          })
        }, 1000)
        
        // Reload data to show new PR
        await loadDashboardData()
        
        // Update selected ticket to show PR info
        if (selectedTicket) {
          setSelectedTicket({
            ...selectedTicket,
            metadata: {
              ...selectedTicket.metadata,
              ai_pr_url: data.pr.url,
              ai_pr_number: data.pr.number
            }
          })
        }
      } else {
        const error = await response.json()
        setAlertModal({
          isOpen: true,
          type: 'error',
          title: 'PR Creation Failed',
          message: `Failed to create PR: ${error.error}`
        })
      }
    } catch (error) {
      console.error('Error creating fix PR:', error)
      setPrProgress({ step: 'Error occurred', progress: 0, details: 'Failed to create pull request' })
      setAlertModal({
        isOpen: true,
        type: 'error',
        title: 'PR Creation Error',
        message: 'Failed to create pull request. Please try again.'
      })
    } finally {
      setCreatingPR(false)
      setPrAbortController(null)
      setTimeout(() => {
        setPrProgress({ step: '', progress: 0, details: '' })
      }, 3000) // Clear progress after 3 seconds
    }
  }

  const cancelPRCreation = () => {
    if (prAbortController) {
      prAbortController.abort()
      setPrProgress({ step: 'Cancelled by user', progress: 0, details: 'Operation cancelled' })
      setCreatingPR(false)
      setPrAbortController(null)
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
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Brain className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">AI Support System</h1>
            </div>
            {!githubConnection.connected ? (
              <div className="flex items-center gap-4">
                {githubConnection.error && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    {githubConnection.needsReauth ? 'GitHub token expired' : githubConnection.error}
                  </div>
                )}
                <button
                  onClick={connectGitHub}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                >
                  <Github className="w-5 h-5" />
                  {githubConnection.needsReauth ? 'Reconnect GitHub' : 'Connect GitHub'}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Connected as {githubConnection.username}
                </div>
                <button
                  onClick={() => checkGitHubConnection(true)}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200"
                >
                  Refresh Repos
                </button>
                <select
                  value={selectedRepo}
                  onChange={(e) => setSelectedRepo(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  {githubConnection.repositories?.map(repo => (
                    <option key={repo.id} value={repo.full_name}>
                      {repo.full_name} {repo.language ? `(${repo.language})` : ''} {repo.private ? '🔒' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <p className="text-gray-600">Intelligent ticket analysis and automated fix generation using Claude AI</p>
          
          {/* GitHub Stats */}
          {githubConnection.connected && githubConnection.stats && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Total Repos</div>
                <div className="text-xl font-bold text-blue-900">{githubConnection.stats.totalRepositories}</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-sm text-green-600 font-medium">Writable</div>
                <div className="text-xl font-bold text-green-900">{githubConnection.stats.writableRepos}</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-sm text-purple-600 font-medium">Private</div>
                <div className="text-xl font-bold text-purple-900">{githubConnection.stats.privateRepos}</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-sm text-orange-600 font-medium">Languages</div>
                <div className="text-xl font-bold text-orange-900">{Object.keys(githubConnection.stats.languages).length}</div>
              </div>
            </div>
          )}
          
          {/* Rate Limit Info */}
          {githubConnection.connected && githubConnection.rateLimit && (
            <div className="mt-2 text-sm text-gray-500">
              GitHub API: {githubConnection.rateLimit.remaining}/{githubConnection.rateLimit.limit} requests remaining
              {githubConnection.lastValidated && (
                <span className="ml-4">Last validated: {new Date(githubConnection.lastValidated).toLocaleTimeString()}</span>
              )}
            </div>
          )}
        </div>

        {/* GitHub Connection Required */}
        {!githubConnection.connected && (
          <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start">
              <AlertTriangle className="w-6 h-6 text-yellow-600 mt-1 mr-4 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-2">GitHub Connection Required</h3>
                <p className="text-yellow-700 mb-4">
                  To use the AI Support System, you need to connect your GitHub account. This allows the system to:
                </p>
                <ul className="list-disc list-inside text-yellow-700 space-y-1 mb-4">
                  <li>Analyze your repository code to understand issues</li>
                  <li>Create branches for AI-generated fixes</li>
                  <li>Open pull requests with suggested solutions</li>
                  <li>Track the status of automated fixes</li>
                </ul>
                <button
                  onClick={connectGitHub}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  <Github className="w-5 h-5" />
                  Connect GitHub Account
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tickets List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Support Tickets</h3>
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
                      <h4 className="font-medium text-gray-900 truncate flex-1">{ticket.title}</h4>
                      <div className="flex items-center gap-2">
                        {ticket.metadata?.ai_pr_number && (
                          <a
                            href={ticket.metadata.ai_pr_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <GitPullRequest className="w-3 h-3" />
                            PR #{ticket.metadata.ai_pr_number}
                          </a>
                        )}
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          ticket.priority === 'high' ? 'bg-red-100 text-red-800' :
                          ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {ticket.priority}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{ticket.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">{ticket.category}</span>
                      {githubConnection.connected && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            analyzeTicket(ticket)
                          }}
                          disabled={analyzing}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {analyzing && selectedTicket?.id === ticket.id ? 'Analyzing...' : 'Analyze with AI'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Analysis Results */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Claude AI Analysis</h3>
            </div>
            <div className="p-6">
              {!selectedTicket ? (
                <div className="text-center py-8">
                  <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Select a ticket to view AI analysis</p>
                </div>
              ) : analyzing ? (
                <div className="text-center py-8">
                  <div className="animate-spin mx-auto mb-4 w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
                  <p className="text-gray-600">Analyzing with Claude AI...</p>
                </div>
              ) : !analysis ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">
                    {githubConnection.connected 
                      ? 'Select a ticket and click "Analyze with AI" to generate insights using Claude'
                      : 'Connect GitHub to enable AI analysis'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Ticket: {selectedTicket.title}</h4>
                    <p className="text-sm text-gray-600">{selectedTicket.description}</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h5 className="font-medium text-gray-900">Repository</h5>
                      <a 
                        href={`https://github.com/${analysis.repository}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {analysis.repository}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-900">Files Analyzed</h5>
                      <ul className="text-sm text-gray-600 mt-1 space-y-1">
                        {analysis.files_analyzed.map((file, idx) => (
                          <li key={idx} className="flex items-center gap-1">
                            <GitBranch className="w-3 h-3" />
                            {file}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-900">Root Cause</h5>
                      <p className="text-sm text-gray-600 mt-1">{analysis.analysis_data?.rootCause || 'No root cause identified'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-gray-900">Complexity</h5>
                        <div className="flex items-center mt-1">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${(analysis.complexity_score || 5) * 10}%` }}
                            ></div>
                          </div>
                          <span className="ml-2 text-sm text-gray-600">{analysis.complexity_score || 5}/10</span>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-900">Confidence</h5>
                        <div className="flex items-center mt-1">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                (analysis.confidence_score || 50) >= 80 ? 'bg-green-600' :
                                (analysis.confidence_score || 50) >= 60 ? 'bg-yellow-600' :
                                'bg-red-600'
                              }`}
                              style={{ width: `${analysis.confidence_score || 50}%` }}
                            ></div>
                          </div>
                          <span className="ml-2 text-sm text-gray-600">{analysis.confidence_score || 50}%</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-900">Suggested Fix</h5>
                      <p className="text-sm text-gray-600 mt-1">{analysis.analysis_data?.suggestedFix?.description || 'No fix description available'}</p>
                      {analysis.analysis_data?.suggestedFix?.codeChanges && (
                        <ul className="mt-2 space-y-1">
                          {analysis.analysis_data?.suggestedFix?.codeChanges?.map((change, idx) => (
                            <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="text-blue-600">•</span>
                              <span>{change.file}: {change.explanation}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {analysis.analysis_data?.risks && analysis.analysis_data.risks.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-900">Risks</h5>
                        <ul className="mt-1 space-y-1">
                          {analysis.analysis_data?.risks?.map((risk, idx) => (
                            <li key={idx} className="text-sm text-yellow-700 flex items-start gap-2">
                              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span>{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div>
                      <h5 className="font-medium text-gray-900">Auto-Fixable</h5>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        analysis.is_auto_fixable 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {analysis.is_auto_fixable ? 'Yes - Can create PR' : 'No - Manual fix required'}
                      </span>
                    </div>

                    {analysis.is_auto_fixable && !selectedTicket.metadata?.ai_pr_number && (
                      <div className="pt-4">
                        <button
                          onClick={createFixPR}
                          disabled={creatingPR}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <GitPullRequest className="w-4 h-4" />
                          {creatingPR ? 'Creating AI Fix...' : 'Create Fix Pull Request'}
                        </button>
                        
                        {creatingPR && (
                          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-blue-900">{prProgress.step}</span>
                              <span className="text-sm text-blue-700">{prProgress.progress}%</span>
                            </div>
                            
                            <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${prProgress.progress}%` }}
                              ></div>
                            </div>
                            
                            <p className="text-xs text-blue-600">{prProgress.details}</p>
                            
                            <div className="mt-3 text-xs text-blue-700">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span>AI Safety Validation Included</span>
                              </div>
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span>Automated Tests Generated</span>
                              </div>
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span>Full Documentation Included</span>
                              </div>
                            </div>
                            
                            <div className="mt-3 flex justify-end">
                              <button
                                onClick={cancelPRCreation}
                                className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedTicket.metadata?.ai_pr_number && (
                      <div className="pt-4">
                        <a
                          href={selectedTicket.metadata.ai_pr_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Pull Request #{selectedTicket.metadata.ai_pr_number}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <Shield className="w-6 h-6 text-blue-600 mt-1 mr-4 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">How It Works</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                <div>
                  <p className="font-medium mb-1">1. Connect GitHub</p>
                  <p>Link your repository for code access</p>
                </div>
                <div>
                  <p className="font-medium mb-1">2. Analyze Tickets</p>
                  <p>Claude AI examines your code and identifies issues</p>
                </div>
                <div>
                  <p className="font-medium mb-1">3. Generate Fixes</p>
                  <p>AI creates precise code changes to solve problems</p>
                </div>
                <div>
                  <p className="font-medium mb-1">4. Review & Merge</p>
                  <p>Automated PRs with full documentation for review</p>
                </div>
              </div>
              <p className="text-blue-700 mt-4">
                Powered by Claude 3.5 Sonnet - Superior code understanding and generation compared to GPT models
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}