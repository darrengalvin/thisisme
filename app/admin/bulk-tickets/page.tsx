'use client'

import { useState } from 'react'

const PRESET_TICKETS = [
  // ============ CRITICAL INFRASTRUCTURE ISSUES ============
  {
    title: 'Implement API Rate Limiting',
    description: `**Problem:** No rate limiting on API endpoints. Vulnerable to DDoS attacks and API abuse.

**Impact:** Attackers can make unlimited requests, risk of server overload and downtime, potential cost explosion from malicious traffic.

**Solution:**
- Install Upstash Redis and @upstash/ratelimit
- Implement rate limiting middleware
- Set limit: 10 requests per 10 seconds per IP
- Add 429 Too Many Requests responses

**Files to Update:** middleware.ts, package.json`,
    priority: "critical",
    category: "security"
  },
  {
    title: 'Add Input Validation with Zod',
    description: `**Problem:** API endpoints accept unvalidated input. Risk of SQL injection, XSS, and data corruption.

**Impact:** Attackers can inject malicious code, data corruption from oversized inputs, server crashes from malformed data.

**Solution:**
- Install Zod validation library
- Create validation schemas for all API inputs
- Add max lengths, type checks, and sanitization
- Return 400 Bad Request for invalid inputs

**Example:** z.object({ title: z.string().max(200), textContent: z.string().max(10000) })`,
    priority: "critical",
    category: "security"
  },
  {
    title: 'Install Sentry Error Tracking',
    description: `**Problem:** No error monitoring service configured. Flying blind in production.

**Impact:** No visibility into production errors, can't track error trends, difficult to reproduce bugs, poor UX.

**Solution:**
- Sign up for Sentry (free tier)
- Install @sentry/nextjs
- Add Sentry config files
- Configure error tracking and source maps
- Set up alerts for critical errors`,
    priority: "critical",
    category: "monitoring"
  },
  {
    title: 'Fix N+1 Query in MyPeopleEnhanced',
    description: `**Problem:** Loading people list makes 1 query + N queries for each person's chapters. Extremely slow.

**Location:** components/MyPeopleEnhanced.tsx

**Impact:** Page load time scales with people count, database overload, poor UX, increased costs.

**Solution:** Use Supabase joins to fetch all data in single query:
.select('*, chapters:timezone_members(timezone:timezones(id, title))')`,
    priority: "critical",
    category: "performance"
  },
  {
    title: 'Set Up Automated Testing with Vitest',
    description: `**Problem:** No automated tests. Every deploy is a gamble.

**Impact:** Regressions go unnoticed, fear of refactoring, difficult onboarding, higher costs, production bugs.

**Solution:**
- Install Vitest and @testing-library/react
- Set up test configuration
- Write tests for: Memory CRUD, Auth flows, Invitation system, Chapter management
- Add CI/CD integration

**Coverage Goals:** Memory 80%+, Auth 90%+, API 70%+`,
    priority: "critical",
    category: "testing"
  },
  {
    title: 'Add Secret Key Rotation Policy',
    description: `**Problem:** No secret key rotation policy. If SUPABASE_SERVICE_ROLE_KEY is compromised, no easy way to rotate.

**Impact:** Compromised keys valid indefinitely, no audit trail, difficult revocation, compliance issues.

**Solution:**
- Document key rotation procedure (every 90 days)
- Create backup admin accounts
- Set up key rotation scripts
- Add key usage logging
- Create SECURITY.md with policies`,
    priority: "high",
    category: "security"
  },
  
]

export default function BulkTicketsPage() {
  const [creating, setCreating] = useState(false)
  const [results, setResults] = useState<string[]>([])

  const createTickets = async () => {
    setCreating(true)
    setResults([])
    
    try {
      // First, check what tickets already exist
      const existingResponse = await fetch('/api/support/tickets', {
        credentials: 'include'
      })
      
      let existingTitles = new Set()
      if (existingResponse.ok) {
        const existingData = await existingResponse.json()
        existingTitles = new Set(existingData.tickets?.map((t: any) => t.title) || [])
      }
      
      for (const ticket of PRESET_TICKETS) {
        try {
          // Skip if ticket already exists
          if (existingTitles.has(ticket.title)) {
            setResults(prev => [...prev, `⏭️ Skipped: ${ticket.title} (already exists)`])
            continue
          }
          
          const response = await fetch('/api/support/tickets', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(ticket)
          })
          
          if (response.ok) {
            const data = await response.json()
            setResults(prev => [...prev, `✅ Created: ${ticket.title} (ID: ${data.ticket.id})`])
          } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
            setResults(prev => [...prev, `❌ Failed: ${ticket.title} - ${errorData.error || 'Unknown error'}`])
          }
        } catch (error) {
          setResults(prev => [...prev, `❌ Error: ${ticket.title} - ${error}`])
        }
      }
    } catch (error) {
      console.error('Bulk creation failed:', error)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">Bulk Create Support Tickets</h1>
      <p className="text-gray-600 mb-8">
        Create {PRESET_TICKETS.length} critical infrastructure tickets from project health analysis
      </p>
      
      <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
        <h2 className="font-semibold text-red-900 mb-2">⚠️ Production-Blocking Issues</h2>
        <p className="text-red-800 text-sm">
          These {PRESET_TICKETS.length} tickets are CRITICAL security, performance, and monitoring issues 
          identified in the project health analysis. They must be addressed before production deployment.
        </p>
      </div>
      
      <div className="mb-8">
        
        <button
          onClick={createTickets}
          disabled={creating}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded"
        >
          {creating ? 'Creating Tickets...' : 'Create All Tickets'}
        </button>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Tickets to Create:</h2>
        <div className="space-y-4">
          {PRESET_TICKETS.map((ticket, index) => (
            <div key={index} className="border p-4 rounded">
              <h3 className="font-semibold">{ticket.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{ticket.description}</p>
              <div className="flex gap-2 mt-2">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  ticket.priority === 'critical' ? 'bg-red-600 text-white' :
                  ticket.priority === 'high' ? 'bg-red-100 text-red-800' :
                  ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {ticket.priority.toUpperCase()}
                </span>
                <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                  {ticket.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {results.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Results:</h2>
          <div className="space-y-2">
            {results.map((result, index) => (
              <div 
                key={index} 
                className={`p-2 rounded ${
                  result.startsWith('✅') ? 'bg-green-100' : 'bg-red-100'
                }`}
              >
                {result}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
