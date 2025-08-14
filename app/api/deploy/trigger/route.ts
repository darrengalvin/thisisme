import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const { ticketId, prNumber } = await request.json()

    if (!ticketId) {
      return NextResponse.json({ error: 'Missing ticketId' }, { status: 400 })
    }

    console.log(`🚀 Triggering deployment for ticket ${ticketId}, PR #${prNumber}`)

    // Option 1: Use Vercel API to trigger deployment
    if (process.env.VERCEL_TOKEN) {
      try {
        const deployResponse = await fetch('https://api.vercel.com/v13/deployments', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: process.env.VERCEL_PROJECT_NAME || 'thisisme',
            gitSource: {
              type: 'github',
              repo: process.env.GITHUB_REPO || 'darrengalvin/thisisme',
              ref: 'main'
            },
            target: 'production'
          })
        })

        if (deployResponse.ok) {
          const deployment = await deployResponse.json()
          console.log(`✅ Vercel deployment triggered: ${deployment.url}`)
          
          return NextResponse.json({
            success: true,
            deploymentUrl: deployment.url,
            deploymentId: deployment.id,
            message: 'Deployment triggered via Vercel API'
          })
        }
      } catch (error) {
        console.warn('Vercel API deployment failed, trying CLI fallback:', error)
      }
    }

    // Option 2: Fallback to local Vercel CLI (if running locally)
    try {
      const { stdout, stderr } = await execAsync('vercel --prod --yes', {
        timeout: 120000, // 2 minute timeout
        cwd: process.cwd()
      })
      
      console.log('Vercel CLI output:', stdout)
      if (stderr) console.warn('Vercel CLI warnings:', stderr)

      // Extract deployment URL from output
      const urlMatch = stdout.match(/https:\/\/[^\s]+\.vercel\.app/i)
      const deploymentUrl = urlMatch ? urlMatch[0] : null

      return NextResponse.json({
        success: true,
        deploymentUrl,
        output: stdout,
        message: 'Deployment triggered via Vercel CLI'
      })

    } catch (execError) {
      console.error('Vercel CLI execution failed:', execError)
      
      return NextResponse.json({
        success: false,
        error: 'Deployment trigger failed',
        message: 'Auto-deployment not available. Please deploy manually with: vercel --prod',
        manualSteps: [
          'Open terminal in project directory',
          'Run: vercel --prod',
          'Wait for deployment to complete',
          'Test the fix on the deployed URL'
        ]
      })
    }

  } catch (error) {
    console.error('Deployment trigger error:', error)
    return NextResponse.json(
      { error: 'Failed to trigger deployment', details: error },
      { status: 500 }
    )
  }
}

// GET endpoint to check deployment status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const deploymentId = searchParams.get('deploymentId')

    if (!deploymentId || !process.env.VERCEL_TOKEN) {
      return NextResponse.json({ error: 'Missing deploymentId or Vercel token' }, { status: 400 })
    }

    const response = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`
      }
    })

    if (response.ok) {
      const deployment = await response.json()
      return NextResponse.json({
        status: deployment.state,
        url: deployment.url,
        ready: deployment.state === 'READY',
        error: deployment.state === 'ERROR'
      })
    }

    return NextResponse.json({ error: 'Failed to check deployment status' }, { status: 500 })

  } catch (error) {
    console.error('Deployment status check error:', error)
    return NextResponse.json({ error: 'Status check failed' }, { status: 500 })
  }
}




