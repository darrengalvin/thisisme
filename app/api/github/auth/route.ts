import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!
const GITHUB_REDIRECT_URI = process.env.NEXT_PUBLIC_URL + '/api/github/callback'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')

  // Debug environment variables
  console.log('Environment variables check:', {
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID ? 'Set' : 'Missing',
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL ? 'Set' : 'Missing',
    actualClientId: process.env.GITHUB_CLIENT_ID,
    actualUrl: process.env.NEXT_PUBLIC_URL
  })

  if (action === 'connect') {
    // Get environment variables at runtime
    const clientId = process.env.GITHUB_CLIENT_ID
    const redirectUri = process.env.NEXT_PUBLIC_URL + '/api/github/callback'
    
    if (!clientId || !process.env.NEXT_PUBLIC_URL) {
      return NextResponse.json({ 
        error: 'GitHub OAuth not configured', 
        debug: {
          clientId: clientId ? 'Set' : 'Missing',
          baseUrl: process.env.NEXT_PUBLIC_URL ? 'Set' : 'Missing'
        }
      }, { status: 500 })
    }

    const scope = 'repo,write:packages,write:org,workflow'
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`
    
    console.log('Generated GitHub OAuth URL:', githubAuthUrl)
    
    return NextResponse.redirect(githubAuthUrl)
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}