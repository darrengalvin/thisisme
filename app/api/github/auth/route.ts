import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!
const GITHUB_REDIRECT_URI = process.env.NEXT_PUBLIC_URL + '/api/github/callback'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')

  if (action === 'connect') {
    // Redirect to GitHub OAuth
    const scope = 'repo,write:packages,write:org,workflow'
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${GITHUB_REDIRECT_URI}&scope=${scope}`
    
    return NextResponse.redirect(githubAuthUrl)
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}