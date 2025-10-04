import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create rate limiter instances
// Note: These will only work if UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set
let ratelimit: Ratelimit | null = null;
let strictRatelimit: Ratelimit | null = null;

// Initialize rate limiters only if environment variables are present
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = Redis.fromEnv();

  // Standard rate limit: 60 requests per minute
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    analytics: true,
    prefix: 'ratelimit',
  });

  // Strict rate limit for auth endpoints: 5 requests per 15 minutes
  strictRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: true,
    prefix: 'ratelimit:auth',
  });
}

export async function middleware(request: NextRequest) {
  // Skip rate limiting if Upstash is not configured (development mode)
  if (!ratelimit || !strictRatelimit) {
    console.warn('⚠️ Rate limiting disabled: Upstash Redis not configured');
    return NextResponse.next();
  }

  const ip = request.headers.get('x-forwarded-for') ?? 
             request.headers.get('x-real-ip') ?? 
             '127.0.0.1';

  const pathname = request.nextUrl.pathname;

  // Determine which rate limiter to use based on the endpoint
  let limiter = ratelimit;
  let limitType = 'standard';

  // Strict rate limiting for authentication endpoints
  if (
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/register') ||
    pathname.startsWith('/api/auth/reset-password')
  ) {
    limiter = strictRatelimit;
    limitType = 'auth';
  }

  try {
    const { success, limit, reset, remaining } = await limiter.limit(ip);

    // Create response
    const response = success 
      ? NextResponse.next() 
      : new NextResponse('Too Many Requests', { status: 429 });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', reset.toString());
    response.headers.set('X-RateLimit-Type', limitType);

    if (!success) {
      console.warn(`🚫 Rate limit exceeded for IP ${ip} on ${pathname} (${limitType})`);
      response.headers.set('Retry-After', Math.ceil((reset - Date.now()) / 1000).toString());
    }

    return response;
  } catch (error) {
    // If rate limiting fails, allow the request but log the error
    console.error('❌ Rate limiting error:', error);
    return NextResponse.next();
  }
}

// Configure which routes to apply middleware to
export const config = {
  matcher: [
    // Apply to all API routes
    '/api/:path*',
    // Exclude static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};