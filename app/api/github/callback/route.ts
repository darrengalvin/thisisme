import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!

export async function GET(request: NextRequest) {
  // Debug environment variables
  console.log('Environment check in callback:', {
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL || 'MISSING',
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID ? 'Set' : 'MISSING'
  })

  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  
  // Use absolute URL with fallback
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://thisisme-three.vercel.app'

  if (!code) {
    console.log('No code provided, redirecting to error page')
    return NextResponse.redirect(`${baseUrl}/admin/ai-support?error=no_code`)
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code
      })
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      console.error('GitHub OAuth error:', tokenData)
      return NextResponse.redirect(`${baseUrl}/admin/ai-support?error=oauth_failed`)
    }

    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    const userData = await userResponse.json()

    // Store in Supabase
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      try {
        // Store GitHub connection
        await supabase.from('github_connections').upsert({
          user_id: user.id,
          github_username: userData.login,
          github_id: userData.id,
          access_token: tokenData.access_token,
          scope: tokenData.scope,
          connected_at: new Date().toISOString()
        })

        // Get user's repositories
        const reposResponse = await fetch('https://api.github.com/user/repos?per_page=100', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        })

        const repos = await reposResponse.json()

        // Store repositories (only if we have valid repo data)
        if (Array.isArray(repos)) {
          for (const repo of repos) {
            await supabase.from('github_repositories').upsert({
              user_id: user.id,
              repo_id: repo.id,
              name: repo.name,
              full_name: repo.full_name,
              owner: repo.owner.login,
              private: repo.private,
              default_branch: repo.default_branch || 'main',
              url: repo.html_url,
              connected_at: new Date().toISOString()
            })
          }
        }
      } catch (dbError) {
        console.error('Database error during GitHub connection:', dbError)
        // Still redirect to success but with a warning
        return NextResponse.redirect(`${baseUrl}/admin/ai-support?github=connected&warning=db_error`)
      }
    }

    console.log('GitHub connection successful, redirecting to success page')
    return NextResponse.redirect(`${baseUrl}/admin/ai-support?github=connected`)
  } catch (error) {
    console.error('GitHub callback error:', error)
    console.log('Error details:', error instanceof Error ? error.message : String(error))
    return NextResponse.redirect(`${baseUrl}/admin/ai-support?error=callback_failed`)
  }
}