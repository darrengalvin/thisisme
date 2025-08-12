import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ connected: false })
    }

    // Check for GitHub connection
    const { data: connection } = await supabase
      .from('github_connections')
      .select('github_username, scope, connected_at')
      .eq('user_id', user.id)
      .single()

    if (!connection) {
      return NextResponse.json({ connected: false })
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
    })
  } catch (error) {
    console.error('GitHub status error:', error)
    return NextResponse.json({ connected: false })
  }
}