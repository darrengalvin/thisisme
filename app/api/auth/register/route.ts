import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, generateToken } from '@/lib/auth'
import { TIMEZONE_TYPES, MEMBER_ROLES } from '@/lib/types'
import { registerSchema, formatZodErrors, sanitizeInput } from '@/lib/validation'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 🛡️ SECURITY: Validate and sanitize input with Zod
    const registerDataSchema = registerSchema.extend({
      confirmPassword: z.string().min(1, 'Confirm password is required')
    })

    let validatedData
    try {
      validatedData = registerDataSchema.parse(body)
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

    const { email, password, confirmPassword } = validatedData

    // Check password match
    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Passwords do not match' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User already exists with this email' },
        { status: 409 }
      )
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password)
    
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword
      }
    })

    // Create a default private time zone for the user
    const privateTimeZone = await prisma.timeZone.create({
      data: {
        title: 'My Personal Memories',
        description: 'Your private collection of memories',
        type: TIMEZONE_TYPES.PRIVATE,
        creatorId: user.id
      }
    })

    // Add user as creator member of the time zone
    await prisma.timeZoneMember.create({
      data: {
        timeZoneId: privateTimeZone.id,
        userId: user.id,
        role: MEMBER_ROLES.CREATOR
      }
    })

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
      message: 'User registered successfully'
    })

  } catch (error) {
    console.error('Registration error:', error)
    // 🛡️ SECURITY: Track errors in Sentry for monitoring
    Sentry.captureException(error, {
      tags: { api: 'auth/register' },
      extra: { message: 'User registration failed' }
    })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 