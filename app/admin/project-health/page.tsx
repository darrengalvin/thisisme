'use client'

import { useState } from 'react'
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Shield, 
  TestTube, 
  Palette, 
  Code, 
  BookOpen, 
  Activity, 
  Eye, 
  Smartphone,
  Box,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  Lock,
  Database,
  FileCode,
  Bug
} from 'lucide-react'

interface ScoreCardItem {
  category: string
  score: number
  grade: string
  icon: any
  color: string
}

interface Issue {
  title: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: string
  description: string
  impact: string
  location?: string
  codeExample?: {
    bad?: string
    good?: string
  }
  fix?: string
}

export default function ProjectHealthPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>('critical')

  const overallScore = 5.9
  const overallGrade = '🟡 C'

  const scoreCard: ScoreCardItem[] = [
    { category: 'Performance', score: 6, grade: 'C+', icon: Zap, color: 'text-yellow-600' },
    { category: 'Security', score: 5, grade: 'D+', icon: Shield, color: 'text-red-600' },
    { category: 'Testing', score: 0, grade: 'F', icon: TestTube, color: 'text-red-700' },
    { category: 'UI/UX', score: 7, grade: 'B-', icon: Palette, color: 'text-green-600' },
    { category: 'Code Quality', score: 7, grade: 'B-', icon: Code, color: 'text-green-600' },
    { category: 'Documentation', score: 4, grade: 'D', icon: BookOpen, color: 'text-orange-600' },
    { category: 'Monitoring', score: 3, grade: 'F', icon: Activity, color: 'text-red-700' },
    { category: 'Accessibility', score: 4, grade: 'D', icon: Eye, color: 'text-orange-600' },
    { category: 'Mobile', score: 6, grade: 'C+', icon: Smartphone, color: 'text-yellow-600' },
    { category: 'Architecture', score: 7, grade: 'B-', icon: Box, color: 'text-green-600' },
  ]

  const criticalIssues: Issue[] = [
    {
      title: 'No Automated Tests',
      priority: 'critical',
      category: 'Testing',
      description: 'Zero test files found in the entire codebase. No .test.ts, .test.tsx, or .spec files.',
      impact: 'Production bugs go undetected. Refactoring is risky. No confidence in deployments.',
      fix: 'Install Vitest and @testing-library/react. Start with critical auth and memory CRUD tests.',
      codeExample: {
        bad: `// No tests found!`,
        good: `// tests/auth.test.ts
describe('Authentication', () => {
  it('should register new user', async () => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'SecurePass123!'
      })
    })
    expect(response.status).toBe(200)
  })
})`
      }
    },
    {
      title: 'No Rate Limiting',
      priority: 'critical',
      category: 'Security',
      description: 'API endpoints have no rate limiting. Vulnerable to brute force, DDoS, and API abuse.',
      impact: 'Potential for massive costs from API abuse. Auth endpoints can be brute forced.',
      location: '/api/auth/login, /api/auth/register, /api/memories',
      fix: 'Add rate limiting middleware using Upstash Redis',
      codeExample: {
        bad: `// No rate limiting
export async function POST(request: NextRequest) {
  // Anyone can hit this unlimited times
  const { email, password } = await request.json()
  // ...
}`,
        good: `// middleware.ts
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
})

export async function middleware(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1"
  const { success } = await ratelimit.limit(ip)
  
  if (!success) {
    return new Response("Too many requests", { status: 429 })
  }
}`
      }
    },
    {
      title: 'Missing Input Validation',
      priority: 'critical',
      category: 'Security',
      description: 'API endpoints accept unvalidated input. Risk of SQL injection, XSS, and data corruption.',
      impact: 'Attackers can inject malicious code, corrupt data, or crash the server.',
      location: 'Most API routes in /app/api/',
      fix: 'Use Zod schemas to validate all inputs',
      codeExample: {
        bad: `// ❌ No validation
const { title, textContent } = await request.json()
// What if textContent is 10MB? SQL injection?`,
        good: `// ✅ With Zod validation
import { z } from 'zod'

const MemorySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  textContent: z.string().max(10000),
  timeZoneId: z.string().uuid().optional()
})

const data = MemorySchema.parse(await request.json())`
      }
    },
    {
      title: 'No Error Monitoring',
      priority: 'critical',
      category: 'Monitoring',
      description: 'No error tracking service (Sentry, Rollbar) configured. Flying blind in production.',
      impact: 'Production errors go unnoticed. No way to diagnose user issues.',
      fix: 'Install and configure Sentry',
      codeExample: {
        good: `// Install Sentry
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs

// sentry.client.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
})`
      }
    },
    {
      title: 'N+1 Query Problem',
      priority: 'critical',
      category: 'Performance',
      description: 'MyPeopleEnhanced component fetches memories for each person individually.',
      impact: 'If you have 50 people, creates 50+ API calls. Page takes 10-30 seconds to load.',
      location: 'components/MyPeopleEnhanced.tsx lines 227-254',
      fix: 'Create bulk fetch endpoint',
      codeExample: {
        bad: `// ❌ N+1 Query
const people = await Promise.all(
  networkPeople.map(async (person) => {
    const response = await fetch(\`/api/network/\${person.id}/memories\`)
    // This creates N separate API calls!
  })
)`,
        good: `// ✅ Batch fetch
const personIds = networkPeople.map(p => p.id)
const response = await fetch(
  \`/api/network/memories-bulk?ids=\${personIds.join(',')}\`
)`
      }
    }
  ]

  const highPriorityIssues: Issue[] = [
    {
      title: 'Inconsistent Error Messages',
      priority: 'high',
      category: 'UX',
      description: 'Error messages are either too generic or too technical for end users.',
      impact: 'Users don\'t know what to do when errors occur.',
      fix: 'Create centralized error message system',
      codeExample: {
        bad: `toast.error('Something went wrong')
toast.error('Failed to fetch memories')`,
        good: `// lib/error-messages.ts
export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Connection lost. Check internet and try again.",
  AUTH_EXPIRED: "Session expired. Please sign in again.",
}

toast.error(ERROR_MESSAGES.NETWORK_ERROR)`
      }
    },
    {
      title: 'Missing Accessibility Features',
      priority: 'high',
      category: 'Accessibility',
      description: 'No aria-labels, keyboard navigation issues, focus management problems.',
      impact: 'Screen readers can\'t use the app. Keyboard-only users struggle.',
      fix: 'Add proper ARIA labels and keyboard handling',
      codeExample: {
        bad: `<button onClick={handleDelete}>
  <X size={20} />
</button>`,
        good: `<button 
  onClick={handleDelete}
  aria-label="Delete memory"
  className="focus:ring-2 focus:ring-red-500"
>
  <X size={20} aria-hidden="true" />
</button>`
      }
    },
    {
      title: 'No Image Optimization',
      priority: 'high',
      category: 'Performance',
      description: 'Using <img> tags instead of Next.js <Image> component.',
      impact: 'Slow page loads, large bundle sizes, poor Core Web Vitals scores.',
      fix: 'Replace all img tags with next/image',
      codeExample: {
        bad: `<img src={memory.image_url} />`,
        good: `import Image from 'next/image'
<Image 
  src={memory.image_url} 
  width={400} 
  height={300}
  alt="Memory photo"
/>`
      }
    }
  ]

  const strengths = [
    { title: 'Modern Tech Stack', description: 'Next.js 14, React 18, TypeScript - great foundation' },
    { title: 'Real-time Collaboration', description: 'Supabase subscriptions working well' },
    { title: 'Voice AI Integration', description: 'VAPI integration is innovative' },
    { title: 'Mobile Responsive', description: 'Good use of Tailwind breakpoints' },
    { title: 'Invitation System', description: 'Well-designed multi-method invitations' },
    { title: 'Feature Rich', description: 'Comprehensive memory management features' },
  ]

  const weekOneActions = [
    { day: 'Monday-Tuesday', task: 'Add rate limiting + input validation', priority: 'critical' },
    { day: 'Wednesday-Thursday', task: 'Install and configure Sentry error tracking', priority: 'critical' },
    { day: 'Friday', task: 'Fix N+1 query in MyPeopleEnhanced', priority: 'critical' },
    { day: 'Weekend', task: 'Set up Vitest and write first tests', priority: 'critical' },
  ]

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    if (score >= 4) return 'text-orange-600'
    return 'text-red-600'
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default: return 'bg-blue-100 text-blue-800 border-blue-300'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Project Health Dashboard</h1>
              <p className="text-slate-600 mt-1">Comprehensive analysis of This Is Me platform</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500">Overall Score</div>
              <div className="text-4xl font-bold text-yellow-600">{overallScore}/10</div>
              <div className="text-lg font-semibold text-yellow-700">{overallGrade}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Score Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {scoreCard.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.category} className="bg-white rounded-xl shadow-md p-6 border border-slate-200 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <Icon className={`${item.color} w-6 h-6`} />
                  <span className={`text-2xl font-bold ${getScoreColor(item.score)}`}>
                    {item.score}
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-900 mb-1">{item.category}</div>
                <div className="text-xs text-slate-500">Grade: {item.grade}</div>
              </div>
            )
          })}
        </div>

        {/* Critical Issues Section */}
        <div className="mb-8">
          <button
            onClick={() => toggleSection('critical')}
            className="w-full bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center justify-between hover:bg-red-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <XCircle className="text-red-600 w-6 h-6" />
              <div className="text-left">
                <h2 className="text-xl font-bold text-red-900">Critical Issues</h2>
                <p className="text-sm text-red-700">Fix these immediately - {criticalIssues.length} issues found</p>
              </div>
            </div>
            {expandedSection === 'critical' ? <ChevronUp /> : <ChevronDown />}
          </button>

          {expandedSection === 'critical' && (
            <div className="mt-4 space-y-4">
              {criticalIssues.map((issue, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md border border-red-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(issue.priority)}`}>
                            {issue.priority.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-500">{issue.category}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">{issue.title}</h3>
                      </div>
                      <Bug className="text-red-500 w-6 h-6 flex-shrink-0" />
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-700 mb-1">Description:</div>
                        <p className="text-sm text-slate-600">{issue.description}</p>
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-slate-700 mb-1">Impact:</div>
                        <p className="text-sm text-red-600">{issue.impact}</p>
                      </div>

                      {issue.location && (
                        <div>
                          <div className="text-sm font-semibold text-slate-700 mb-1">Location:</div>
                          <code className="text-xs bg-slate-100 px-2 py-1 rounded">{issue.location}</code>
                        </div>
                      )}

                      {issue.fix && (
                        <div>
                          <div className="text-sm font-semibold text-green-700 mb-1">✅ Fix:</div>
                          <p className="text-sm text-green-600">{issue.fix}</p>
                        </div>
                      )}

                      {issue.codeExample && (
                        <div className="mt-4 space-y-2">
                          {issue.codeExample.bad && (
                            <div>
                              <div className="text-xs font-semibold text-red-700 mb-1">❌ Problem:</div>
                              <pre className="bg-red-50 border border-red-200 rounded p-3 text-xs overflow-x-auto">
                                <code>{issue.codeExample.bad}</code>
                              </pre>
                            </div>
                          )}
                          {issue.codeExample.good && (
                            <div>
                              <div className="text-xs font-semibold text-green-700 mb-1">✅ Solution:</div>
                              <pre className="bg-green-50 border border-green-200 rounded p-3 text-xs overflow-x-auto">
                                <code>{issue.codeExample.good}</code>
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* High Priority Issues */}
        <div className="mb-8">
          <button
            onClick={() => toggleSection('high')}
            className="w-full bg-orange-50 border-2 border-orange-200 rounded-xl p-4 flex items-center justify-between hover:bg-orange-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-orange-600 w-6 h-6" />
              <div className="text-left">
                <h2 className="text-xl font-bold text-orange-900">High Priority Issues</h2>
                <p className="text-sm text-orange-700">Address soon - {highPriorityIssues.length} issues found</p>
              </div>
            </div>
            {expandedSection === 'high' ? <ChevronUp /> : <ChevronDown />}
          </button>

          {expandedSection === 'high' && (
            <div className="mt-4 space-y-4">
              {highPriorityIssues.map((issue, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md border border-orange-200 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(issue.priority)}`}>
                      {issue.priority.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500">{issue.category}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{issue.title}</h3>
                  <p className="text-sm text-slate-600 mb-2">{issue.description}</p>
                  <p className="text-sm text-orange-600 mb-3">Impact: {issue.impact}</p>
                  {issue.codeExample && (
                    <div className="space-y-2">
                      {issue.codeExample.bad && (
                        <div>
                          <div className="text-xs font-semibold text-red-700 mb-1">❌ Problem:</div>
                          <pre className="bg-red-50 border border-red-200 rounded p-2 text-xs overflow-x-auto">
                            <code>{issue.codeExample.bad}</code>
                          </pre>
                        </div>
                      )}
                      {issue.codeExample.good && (
                        <div>
                          <div className="text-xs font-semibold text-green-700 mb-1">✅ Solution:</div>
                          <pre className="bg-green-50 border border-green-200 rounded p-2 text-xs overflow-x-auto">
                            <code>{issue.codeExample.good}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Strengths Section */}
        <div className="mb-8">
          <button
            onClick={() => toggleSection('strengths')}
            className="w-full bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-center justify-between hover:bg-green-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="text-green-600 w-6 h-6" />
              <div className="text-left">
                <h2 className="text-xl font-bold text-green-900">What You're Doing Well</h2>
                <p className="text-sm text-green-700">{strengths.length} strengths identified</p>
              </div>
            </div>
            {expandedSection === 'strengths' ? <ChevronUp /> : <ChevronDown />}
          </button>

          {expandedSection === 'strengths' && (
            <div className="mt-4 grid md:grid-cols-2 gap-4">
              {strengths.map((strength, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md border border-green-200 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="text-green-500 w-5 h-5 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">{strength.title}</h3>
                      <p className="text-sm text-slate-600">{strength.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Week 1 Action Plan */}
        <div className="mb-8">
          <button
            onClick={() => toggleSection('action')}
            className="w-full bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-center justify-between hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Clock className="text-blue-600 w-6 h-6" />
              <div className="text-left">
                <h2 className="text-xl font-bold text-blue-900">Week 1 Action Plan</h2>
                <p className="text-sm text-blue-700">Start here - {weekOneActions.length} critical tasks</p>
              </div>
            </div>
            {expandedSection === 'action' ? <ChevronUp /> : <ChevronDown />}
          </button>

          {expandedSection === 'action' && (
            <div className="mt-4 space-y-3">
              {weekOneActions.map((action, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md border border-blue-200 p-4 flex items-center gap-4">
                  <div className="bg-blue-100 text-blue-900 rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-blue-600 font-semibold mb-1">{action.day}</div>
                    <div className="font-semibold text-slate-900">{action.task}</div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityColor(action.priority)}`}>
                    {action.priority.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Commands */}
        <div className="bg-slate-900 text-white rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <FileCode className="w-5 h-5" />
            Quick Start Commands
          </h3>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-slate-400 mb-1">Install Rate Limiting & Validation:</div>
              <code className="block bg-slate-800 px-3 py-2 rounded text-sm font-mono">
                npm install @upstash/ratelimit @upstash/redis zod
              </code>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Install Error Tracking:</div>
              <code className="block bg-slate-800 px-3 py-2 rounded text-sm font-mono">
                npm install @sentry/nextjs && npx @sentry/wizard@latest -i nextjs
              </code>
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1">Install Testing:</div>
              <code className="block bg-slate-800 px-3 py-2 rounded text-sm font-mono">
                npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
              </code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>📊 Analysis completed: October 4, 2025</p>
          <p className="mt-1">Full detailed report available in: <code className="bg-slate-100 px-2 py-1 rounded">COMPREHENSIVE_PROJECT_ANALYSIS.md</code></p>
        </div>

      </div>
    </div>
  )
}

