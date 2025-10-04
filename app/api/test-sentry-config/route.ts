import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  
  return NextResponse.json({
    dsnConfigured: !!dsn,
    dsnLength: dsn?.length || 0,
    dsnStart: dsn?.substring(0, 30) || 'NOT FOUND',
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('SENTRY')),
    nodeEnv: process.env.NODE_ENV
  })
}
