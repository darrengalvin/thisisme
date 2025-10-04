import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define the critical issues from the project health analysis
const criticalIssues = [
  {
    title: 'Implement API Rate Limiting',
    description: `**Problem:** No rate limiting on API endpoints. Vulnerable to DDoS attacks and API abuse.

**Impact:** 
- Attackers can make unlimited requests
- Risk of server overload and downtime
- Potential cost explosion from malicious traffic

**Solution:**
- Install Upstash Redis and @upstash/ratelimit
- Implement rate limiting middleware
- Set limit: 10 requests per 10 seconds per IP
- Add 429 Too Many Requests responses

**Files to Update:**
- \`middleware.ts\` (create with rate limiting)
- \`package.json\` (add dependencies)

**Priority:** CRITICAL - This is a production security risk`,
    priority: 'critical',
    category: 'security',
    stage: 'todo'
  },
  {
    title: 'Add Input Validation with Zod',
    description: `**Problem:** API endpoints accept unvalidated input. Risk of SQL injection, XSS, and data corruption.

**Impact:**
- Attackers can inject malicious code
- Data corruption from oversized inputs
- Server crashes from malformed data
- Security vulnerabilities (SQL injection, XSS)

**Solution:**
- Install Zod validation library
- Create validation schemas for all API inputs
- Add max lengths, type checks, and sanitization
- Return 400 Bad Request for invalid inputs

**Example Implementation:**
\`\`\`typescript
import { z } from 'zod'

const MemorySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  textContent: z.string().max(10000),
  timeZoneId: z.string().uuid().optional()
})
\`\`\`

**Priority:** CRITICAL - Security and stability risk`,
    priority: 'critical',
    category: 'security',
    stage: 'todo'
  },
  {
    title: 'Install Sentry Error Tracking',
    description: `**Problem:** No error monitoring service configured. Flying blind in production.

**Impact:**
- No visibility into production errors
- Can't track error trends or patterns
- Difficult to reproduce and fix bugs
- Poor user experience due to untracked issues

**Solution:**
- Sign up for Sentry (free tier available)
- Install @sentry/nextjs package
- Add Sentry config files
- Configure error tracking and source maps
- Set up alerts for critical errors

**Configuration:**
- Add SENTRY_DSN to .env
- Create sentry.client.config.ts
- Create sentry.server.config.ts
- Add Sentry to next.config.js

**Priority:** CRITICAL - Essential for production monitoring`,
    priority: 'critical',
    category: 'monitoring',
    stage: 'todo'
  },
  {
    title: 'Fix N+1 Query in MyPeopleEnhanced',
    description: `**Problem:** Loading people list makes 1 query + N queries for each person's chapters. Extremely slow with many people.

**Location:** \`components/MyPeopleEnhanced.tsx\`

**Impact:**
- Page load time scales linearly with number of people
- Database overload with many users
- Poor user experience (slow loading)
- Increased database costs

**Current Code:**
\`\`\`typescript
// ❌ BAD: N+1 queries
const people = await supabase.from('network').select('*')
for (const person of people) {
  const chapters = await supabase.from('chapters').select('*').eq('person_id', person.id)
}
\`\`\`

**Solution:**
\`\`\`typescript
// ✅ GOOD: Single query with join
const people = await supabase
  .from('network')
  .select(\`
    *,
    chapters:timezone_members(
      timezone:timezones(id, title, description)
    )
  \`)
\`\`\`

**Priority:** CRITICAL - Performance bottleneck`,
    priority: 'critical',
    category: 'performance',
    stage: 'todo'
  },
  {
    title: 'Add Secret Key Rotation Policy',
    description: `**Problem:** No secret key rotation policy. If SUPABASE_SERVICE_ROLE_KEY is compromised, no easy way to rotate.

**Impact:**
- Compromised keys remain valid indefinitely
- No audit trail of key usage
- Difficult to revoke access if leaked
- Compliance issues for regulated industries

**Solution:**
1. Document key rotation procedure
2. Add key rotation reminders (every 90 days)
3. Create backup admin user accounts
4. Set up key rotation scripts
5. Add key usage logging

**Action Items:**
- Create \`SECURITY.md\` with rotation policy
- Set calendar reminder for key rotation
- Document emergency revocation procedure
- Add Supabase logs monitoring

**Priority:** HIGH - Security best practice`,
    priority: 'high',
    category: 'security',
    stage: 'todo'
  },
  {
    title: 'Set Up Automated Testing with Vitest',
    description: `**Problem:** No automated tests. Every deploy is a gamble.

**Impact:**
- Regressions go unnoticed
- Fear of refactoring code
- Difficult to onboard new developers
- Higher maintenance costs
- Production bugs

**Solution:**
1. Install Vitest and testing libraries
2. Set up test configuration
3. Write critical path tests:
   - Memory creation/editing
   - Chapter management
   - Invitation system
   - Authentication flows
4. Add CI/CD integration

**Test Coverage Goals:**
- Memory CRUD operations: 80%+
- Authentication: 90%+
- API endpoints: 70%+
- Invitation system: 80%+

**Priority:** CRITICAL - Quality assurance`,
    priority: 'critical',
    category: 'testing',
    stage: 'todo'
  }
];

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify JWT token and check admin status
    const { verifyToken } = await import('@/lib/auth');
    const userInfo = await verifyToken(token);
    
    if (!userInfo) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, is_admin')
      .eq('id', userInfo.userId)
      .single();

    if (userError || !userData || !userData.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check if tickets already exist (to avoid duplicates)
    const { data: existingTickets } = await supabase
      .from('tickets')
      .select('title')
      .in('title', criticalIssues.map(issue => issue.title));

    const existingTitles = new Set(existingTickets?.map(t => t.title) || []);
    const ticketsToCreate = criticalIssues.filter(issue => !existingTitles.has(issue.title));

    if (ticketsToCreate.length === 0) {
      return NextResponse.json({ 
        message: 'All critical issue tickets already exist',
        created: 0,
        skipped: criticalIssues.length
      });
    }

    // Create tickets for critical issues
    const ticketInserts = ticketsToCreate.map(issue => ({
      title: issue.title,
      description: issue.description,
      priority: issue.priority,
      category: issue.category,
      stage: issue.stage,
      creator_id: userData.id,
      status: 'open',
      metadata: {
        source: 'project_health_analysis',
        generated_at: new Date().toISOString()
      }
    }));

    const { data: createdTickets, error: insertError } = await supabase
      .from('tickets')
      .insert(ticketInserts)
      .select();

    if (insertError) {
      console.error('Error creating tickets:', insertError);
      return NextResponse.json({ error: 'Failed to create tickets' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: `Created ${createdTickets?.length || 0} tickets from project health analysis`,
      created: createdTickets?.length || 0,
      skipped: criticalIssues.length - ticketsToCreate.length,
      tickets: createdTickets
    });
  } catch (error) {
    console.error('Error in POST /api/admin/generate-health-tickets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

