import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')

  // Debug environment variables
  console.log('GitHub Auth - Environment variables check:', {
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID ? 'Set' : 'Missing',
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL ? 'Set' : 'Missing',
    hasClientSecret: process.env.GITHUB_CLIENT_SECRET ? 'Set' : 'Missing'
  })

  if (action === 'connect') {
    const clientId = process.env.GITHUB_CLIENT_ID
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://thisisme-three.vercel.app'
    const redirectUri = `${baseUrl}/api/github/callback`
    
    if (!clientId || !process.env.GITHUB_CLIENT_SECRET) {
      console.error('GitHub OAuth not properly configured:', {
        clientId: clientId ? 'Set' : 'Missing',
        clientSecret: process.env.GITHUB_CLIENT_SECRET ? 'Set' : 'Missing',
        baseUrl
      })
      return NextResponse.json({ 
        error: 'GitHub OAuth not configured', 
        debug: {
          clientId: clientId ? 'Set' : 'Missing',
          baseUrl,
          missingVars: [
            !clientId && 'GITHUB_CLIENT_ID',
            !process.env.GITHUB_CLIENT_SECRET && 'GITHUB_CLIENT_SECRET'
          ].filter(Boolean)
        }
      }, { status: 500 })
    }

    // Enhanced scopes for better repository access and workflow management
    const scopes = [
      'repo',           // Full repository access
      'workflow',       // GitHub Actions workflow access
      'write:packages', // Package registry access
      'read:org',       // Organization membership
      'user:email',     // User email access
      'read:user'       // User profile access
    ].join(',')

    // Add state parameter for security
    const state = crypto.randomUUID()
    
    const githubAuthUrl = new URL('https://github.com/login/oauth/authorize')
    githubAuthUrl.searchParams.set('client_id', clientId)
    githubAuthUrl.searchParams.set('redirect_uri', redirectUri)
    githubAuthUrl.searchParams.set('scope', scopes)
    githubAuthUrl.searchParams.set('state', state)
    githubAuthUrl.searchParams.set('allow_signup', 'false') // Only existing GitHub users
    
    console.log('GitHub Auth - Generated OAuth URL:', githubAuthUrl.toString())
    console.log('GitHub Auth - Redirect URI:', redirectUri)
    
    // Store state in session for verification (you might want to use a more secure method)
    const response = NextResponse.redirect(githubAuthUrl.toString())
    response.cookies.set('github_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600 // 10 minutes
    })
    
    return response
  }

  if (action === 'disconnect') {
    try {
      const supabase = createServerSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Remove GitHub connection
      await supabase
        .from('github_connections')
        .delete()
        .eq('user_id', user.id)

      // Remove associated repositories
      await supabase
        .from('github_repositories')
        .delete()
        .eq('user_id', user.id)

      return NextResponse.json({ success: true, message: 'GitHub disconnected' })
    } catch (error) {
      console.error('GitHub disconnect error:', error)
      return NextResponse.json({ error: 'Failed to disconnect GitHub' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}