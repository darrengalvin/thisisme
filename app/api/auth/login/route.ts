import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyPassword, generateToken } from '@/lib/auth'
import { loginSchema, formatZodErrors } from '@/lib/validation'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 🛡️ SECURITY: Validate input with Zod
    let validatedData
    try {
      validatedData = loginSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = formatZodErrors(error)
        return NextResponse.json(
          { success: false, error: 'Invalid input', details: errorMessages },
          { status: 400 }
        )
      }
      throw error
    }

    const { email, password } = validatedData

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Generate JWT token
    const token = await generateToken(user)

    // Return user data (excluding password)
    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }

    return NextResponse.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token
      },
      message: 'Login successful'
    })

  } catch (error) {
    console.error('Login error:', error)
    // 🛡️ SECURITY: Track errors in Sentry for monitoring
    Sentry.captureException(error, {
      tags: { api: 'auth/login' },
      extra: { message: 'User login failed' }
    })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 