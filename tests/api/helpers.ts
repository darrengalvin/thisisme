// 🧪 Test Helpers for API Integration Tests

import { NextRequest, NextResponse } from 'next/server';

/**
 * Creates a mock NextRequest for testing API routes
 */
export function createMockRequest(options: {
  method?: string;
  url?: string;
  body?: any;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}): NextRequest {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    body,
    headers = {},
    cookies = {},
  } = options;

  const requestInit: any = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    requestInit.body = JSON.stringify(body);
  }

  const request = new NextRequest(url, requestInit);

  // Add cookies to the request
  Object.entries(cookies).forEach(([name, value]) => {
    request.cookies.set(name, value);
  });

  return request;
}

/**
 * Extracts JSON from NextResponse
 */
export async function extractJSON(response: NextResponse): Promise<any> {
  const text = await response.text();
  if (!text) return null;
  
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('Failed to parse response:', text);
    throw new Error(`Invalid JSON response: ${text}`);
  }
}

/**
 * Creates a mock authenticated request with JWT token
 */
export function createAuthenticatedRequest(options: {
  method?: string;
  url?: string;
  body?: any;
  userId: string;
  email: string;
}): NextRequest {
  const { userId, email, ...requestOptions } = options;

  // Create a mock JWT token (in real scenario, use actual token generation)
  const mockToken = Buffer.from(
    JSON.stringify({
      userId,
      email,
      iat: Date.now(),
    })
  ).toString('base64');

  return createMockRequest({
    ...requestOptions,
    cookies: {
      auth_token: mockToken,
    },
  });
}

/**
 * Asserts that a response has the expected status code
 */
export function expectStatus(response: NextResponse, expectedStatus: number) {
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status}`
    );
  }
}

/**
 * Generates a random email for testing
 */
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `test-${timestamp}-${random}@example.com`;
}

/**
 * Generates a valid test password
 */
export function generateTestPassword(): string {
  return 'TestPass123!';
}

/**
 * Creates test user data
 */
export function createTestUser(overrides?: Partial<{
  email: string;
  password: string;
  fullName: string;
}>): {
  email: string;
  password: string;
  fullName?: string;
} {
  return {
    email: generateTestEmail(),
    password: generateTestPassword(),
    fullName: 'Test User',
    ...overrides,
  };
}

/**
 * Delays execution for testing async operations
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock environment variables for testing
 */
export function mockEnvVars(vars: Record<string, string>) {
  const original: Record<string, string | undefined> = {};

  Object.entries(vars).forEach(([key, value]) => {
    original[key] = process.env[key];
    process.env[key] = value;
  });

  return {
    restore: () => {
      Object.entries(original).forEach(([key, value]) => {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      });
    },
  };
}

/**
 * Generates a mock UUID for testing
 */
export function generateMockUUID(): string {
  return '550e8400-e29b-41d4-a716-446655440000';
}

/**
 * Strips sensitive data from objects for assertion
 */
export function stripSensitiveData<T extends Record<string, any>>(
  obj: T,
  sensitiveKeys: string[] = ['password', 'token', 'secret']
): Partial<T> {
  const result: any = { ...obj };

  sensitiveKeys.forEach((key) => {
    if (key in result) {
      delete result[key];
    }
  });

  return result;
}
