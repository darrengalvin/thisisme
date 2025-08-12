import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    console.log('GitHub status check:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email
    })

    if (!user) {
      console.log('No user found in GitHub status check')
      return NextResponse.json({ connected: false }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

    // Check for GitHub connection
    const { data: connection, error: connectionError } = await supabase
      .from('github_connections')
      .select('github_username, scope, connected_at')
      .eq('user_id', user.id)
      .single()

    console.log('GitHub connection query result:', {
      hasConnection: !!connection,
      connection,
      error: connectionError
    })

    if (!connection) {
      console.log('No GitHub connection found for user:', user.id)
      return NextResponse.json({ connected: false }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache', 
          'Expires': '0'
        }
      })
    }

    // Get repositories
    const { data: repositories } = await supabase
      .from('github_repositories')
      .select('id, name, full_name, owner, default_branch, url')
      .eq('user_id', user.id)
      .order('name')

    return NextResponse.json({
      connected: true,
      username: connection.github_username,
      repositories: repositories || []
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('GitHub status error:', error)
    return NextResponse.json({ connected: false }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
}