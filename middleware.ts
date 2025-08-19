import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Allow VAPI webhook to bypass authentication
  if (request.nextUrl.pathname === '/api/vapi/webhook') {
    return NextResponse.next()
  }
  
  // For all other routes, continue with normal processing
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/vapi/webhook (allow VAPI webhook access)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/vapi/webhook|_next/static|_next/image|favicon.ico).*)',
  ],
}
