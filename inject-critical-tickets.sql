-- Inject 6 Critical Issue Tickets from Project Health Analysis
-- Run this in Supabase SQL Editor

-- First, get your admin user ID (replace with your actual user ID)
-- You can find it by running: SELECT id FROM users WHERE email = 'dgalvin@yourcaio.co.uk';
-- Your user ID: 9a9c09ee-8d59-450b-bf43-58ee373621b8

INSERT INTO tickets (
  title,
  description,
  priority,
  category,
  stage,
  creator_id,
  status,
  metadata,
  created_at,
  updated_at
) VALUES
-- Ticket 1: Rate Limiting
(
  'Implement API Rate Limiting',
  '**Problem:** No rate limiting on API endpoints. Vulnerable to DDoS attacks and API abuse.

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
- `middleware.ts` (create with rate limiting)
- `package.json` (add dependencies)

**Priority:** CRITICAL - This is a production security risk',
  'critical',
  'security',
  'backlog',
  '9a9c09ee-8d59-450b-bf43-58ee373621b8',
  'open',
  '{"source": "project_health_analysis", "generated_at": "2025-01-04T00:00:00Z"}',
  NOW(),
  NOW()
),

-- Ticket 2: Input Validation
(
  'Add Input Validation with Zod',
  '**Problem:** API endpoints accept unvalidated input. Risk of SQL injection, XSS, and data corruption.

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
```typescript
import { z } from ''zod''

const MemorySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  textContent: z.string().max(10000),
  timeZoneId: z.string().uuid().optional()
})
```

**Priority:** CRITICAL - Security and stability risk',
  'critical',
  'security',
  'backlog',
  '9a9c09ee-8d59-450b-bf43-58ee373621b8',
  'open',
  '{"source": "project_health_analysis", "generated_at": "2025-01-04T00:00:00Z"}',
  NOW(),
  NOW()
),

-- Ticket 3: Sentry Error Tracking
(
  'Install Sentry Error Tracking',
  '**Problem:** No error monitoring service configured. Flying blind in production.

**Impact:**
- No visibility into production errors
- Can''t track error trends or patterns
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

**Priority:** CRITICAL - Essential for production monitoring',
  'critical',
  'monitoring',
  'backlog',
  '9a9c09ee-8d59-450b-bf43-58ee373621b8',
  'open',
  '{"source": "project_health_analysis", "generated_at": "2025-01-04T00:00:00Z"}',
  NOW(),
  NOW()
),

-- Ticket 4: N+1 Query Fix
(
  'Fix N+1 Query in MyPeopleEnhanced',
  '**Problem:** Loading people list makes 1 query + N queries for each person''s chapters. Extremely slow with many people.

**Location:** `components/MyPeopleEnhanced.tsx`

**Impact:**
- Page load time scales linearly with number of people
- Database overload with many users
- Poor user experience (slow loading)
- Increased database costs

**Current Code:**
```typescript
// ❌ BAD: N+1 queries
const people = await supabase.from(''network'').select(''*'')
for (const person of people) {
  const chapters = await supabase.from(''chapters'').select(''*'').eq(''person_id'', person.id)
}
```

**Solution:**
```typescript
// ✅ GOOD: Single query with join
const people = await supabase
  .from(''network'')
  .select(`
    *,
    chapters:timezone_members(
      timezone:timezones(id, title, description)
    )
  `)
```

**Priority:** CRITICAL - Performance bottleneck',
  'critical',
  'performance',
  'backlog',
  '9a9c09ee-8d59-450b-bf43-58ee373621b8',
  'open',
  '{"source": "project_health_analysis", "generated_at": "2025-01-04T00:00:00Z"}',
  NOW(),
  NOW()
),

-- Ticket 5: Secret Key Rotation
(
  'Add Secret Key Rotation Policy',
  '**Problem:** No secret key rotation policy. If SUPABASE_SERVICE_ROLE_KEY is compromised, no easy way to rotate.

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
- Create `SECURITY.md` with rotation policy
- Set calendar reminder for key rotation
- Document emergency revocation procedure
- Add Supabase logs monitoring

**Priority:** HIGH - Security best practice',
  'high',
  'security',
  'backlog',
  '9a9c09ee-8d59-450b-bf43-58ee373621b8',
  'open',
  '{"source": "project_health_analysis", "generated_at": "2025-01-04T00:00:00Z"}',
  NOW(),
  NOW()
),

-- Ticket 6: Automated Testing
(
  'Set Up Automated Testing with Vitest',
  '**Problem:** No automated tests. Every deploy is a gamble.

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

**Priority:** CRITICAL - Quality assurance',
  'critical',
  'testing',
  'backlog',
  '9a9c09ee-8d59-450b-bf43-58ee373621b8',
  'open',
  '{"source": "project_health_analysis", "generated_at": "2025-01-04T00:00:00Z"}',
  NOW(),
  NOW()
);

-- Verify the tickets were created
SELECT 
  id,
  title,
  priority,
  category,
  stage,
  status,
  created_at
FROM tickets
WHERE metadata->>'source' = 'project_health_analysis'
ORDER BY created_at DESC;

