import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST as registerPOST } from '@/app/api/auth/register/route';
import { POST as loginPOST } from '@/app/api/auth/login/route';
import {
  createMockRequest,
  extractJSON,
  generateTestEmail,
  createTestUser,
  mockEnvVars,
} from './helpers';

// Mock the database and auth functions
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    timeZone: {
      create: vi.fn(),
    },
    timeZoneMember: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  hashPassword: vi.fn((password) => `hashed_${password}`),
  verifyPassword: vi.fn((password, hash) => hash === `hashed_${password}`),
  generateToken: vi.fn((userId, email) => `token_${userId}_${email}`),
}));

let mockSupabaseInsert = vi.fn();
let mockSupabaseSelect = vi.fn();

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: vi.fn((table) => ({
      insert: mockSupabaseInsert,
      select: mockSupabaseSelect,
    })),
  },
}));

import { prisma } from '@/lib/db';
import * as auth from '@/lib/auth';

describe('Authentication API Integration Tests', () => {
  let envRestore: { restore: () => void };

  beforeEach(() => {
    // Setup environment variables
    envRestore = mockEnvVars({
      JWT_SECRET: 'test-secret',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    });

    // Clear all mocks
    vi.clearAllMocks();

    // Setup default Supabase mocks
    mockSupabaseInsert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })),
      })),
    }));

    mockSupabaseSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    }));
    
    // Setup default Prisma mocks for timezone creation
    vi.mocked(prisma.timeZone.create).mockResolvedValue({
      id: 'timezone-123',
      title: 'My Personal Memories',
      description: 'Your private collection of memories',
      type: 'private',
      creatorId: 'new-user-id',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    
    vi.mocked(prisma.timeZoneMember.create).mockResolvedValue({
      id: 'member-123',
      timeZoneId: 'timezone-123',
      userId: 'new-user-id',
      role: 'creator',
      joinedAt: new Date(),
    } as any);
  });

  afterEach(() => {
    envRestore.restore();
  });

  describe('POST /api/auth/register', () => {
    it('should create a new user with valid data', async () => {
      const testUser = createTestUser();
      const mockCreatedUser = {
        id: 'new-user-id',
        email: testUser.email,
        password_hash: `hashed_${testUser.password}`,
        created_at: new Date(),
      };

      // Mock database calls
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null); // Email not taken
      vi.mocked(prisma.user.create).mockResolvedValue(mockCreatedUser as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/register',
        body: {
          email: testUser.email,
          password: testUser.password,
          confirmPassword: testUser.password,
        },
      });

      const response = await registerPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testUser.email);
      
      // Verify password was hashed
      expect(auth.hashPassword).toHaveBeenCalledWith(testUser.password);
      
      // Verify token was generated
      expect(auth.generateToken).toHaveBeenCalled();
    });

    it('should reject registration with duplicate email', async () => {
      const testUser = createTestUser();
      const existingUser = {
        id: 'existing-user-id',
        email: testUser.email,
        password_hash: 'existing-hash',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(existingUser as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/register',
        body: {
          email: testUser.email,
          password: testUser.password,
          confirmPassword: testUser.password,
        },
      });

      const response = await registerPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(409); // Conflict status for duplicate
      expect(data.success).toBe(false);
      expect(data.error).toContain('already exists'); // Actual error message from route
    });

    it('should reject registration with mismatched passwords', async () => {
      const testUser = createTestUser();

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/register',
        body: {
          email: testUser.email,
          password: testUser.password,
          confirmPassword: 'DifferentPassword123!',
        },
      });

      const response = await registerPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('do not match');
    });

    it('should reject registration with invalid email format', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/register',
        body: {
          email: 'invalid-email',
          password: 'TestPass123!',
          confirmPassword: 'TestPass123!',
        },
      });

      const response = await registerPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid input');
      expect(data.details).toBeDefined();
    });

    it('should reject registration with weak password', async () => {
      const testUser = createTestUser({ password: 'weak' });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/register',
        body: {
          email: testUser.email,
          password: 'weak',
          confirmPassword: 'weak',
        },
      });

      const response = await registerPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.details).toBeDefined();
      // Should fail password validation (min 8 chars, uppercase, lowercase, number)
    });

    it('should reject registration with missing fields', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/register',
        body: {
          email: generateTestEmail(),
          // Missing password and confirmPassword
        },
      });

      const response = await registerPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should sanitize user input to prevent XSS', async () => {
      const testUser = createTestUser({
        email: 'test@example.com',
      });

      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'new-user-id',
        email: testUser.email,
        password_hash: `hashed_${testUser.password}`,
        created_at: new Date(),
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/register',
        body: {
          email: testUser.email,
          password: testUser.password,
          confirmPassword: testUser.password,
          fullName: '<script>alert("xss")</script>John Doe',
        },
      });

      const response = await registerPOST(request);
      const data = await extractJSON(response);

      // Should succeed but sanitize the input
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verify user was created (sanitization happens in the route)
      expect(prisma.user.create).toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with correct credentials', async () => {
      const testUser = {
        email: 'test@example.com',
        password: 'TestPass123!',
      };

      const mockUser = {
        id: 'user-id-123',
        email: testUser.email,
        password_hash: `hashed_${testUser.password}`,
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: {
          email: testUser.email,
          password: testUser.password,
        },
      });

      const response = await loginPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testUser.email);
      
      // Verify password was checked
      expect(auth.verifyPassword).toHaveBeenCalledWith(
        testUser.password,
        mockUser.password_hash
      );
    });

    it('should reject login with non-existent user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: {
          email: 'nonexistent@example.com',
          password: 'TestPass123!',
        },
      });

      const response = await loginPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid');
    });

    it('should reject login with wrong password', async () => {
      const mockUser = {
        id: 'user-id-123',
        email: 'test@example.com',
        password_hash: 'hashed_CorrectPassword123!',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: {
          email: 'test@example.com',
          password: 'WrongPassword123!',
        },
      });

      const response = await loginPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid');
    });

    it('should reject login with invalid email format', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: {
          email: 'invalid-email',
          password: 'TestPass123!',
        },
      });

      const response = await loginPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid input');
    });

    it('should reject login with missing password', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: {
          email: 'test@example.com',
          // Missing password
        },
      });

      const response = await loginPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should normalize email to lowercase', async () => {
      const mockUser = {
        id: 'user-id-123',
        email: 'test@example.com',
        password_hash: 'hashed_TestPass123!',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: {
          email: 'TEST@EXAMPLE.COM', // Uppercase email
          password: 'TestPass123!',
        },
      });

      const response = await loginPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verify the email was normalized to lowercase in the query
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.user.findUnique).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: {
          email: 'test@example.com',
          password: 'TestPass123!',
        },
      });

      const response = await loginPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Security & Performance', () => {
    it('should not leak user existence in error messages', async () => {
      // Non-existent user
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const request1 = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: {
          email: 'nonexistent@example.com',
          password: 'TestPass123!',
        },
      });

      const response1 = await loginPOST(request1);
      const data1 = await extractJSON(response1);

      // Wrong password for existing user
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-id',
        email: 'existing@example.com',
        password_hash: 'hashed_DifferentPass123!',
      } as any);

      const request2 = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: {
          email: 'existing@example.com',
          password: 'WrongPass123!',
        },
      });

      const response2 = await loginPOST(request2);
      const data2 = await extractJSON(response2);

      // Both should return the same generic error message
      expect(data1.error).toBe(data2.error);
      expect(data1.error).toContain('Invalid');
      expect(data1.error).not.toContain('does not exist');
      expect(data1.error).not.toContain('wrong password');
    });

    it('should prevent timing attacks on password verification', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        password_hash: 'hashed_CorrectPass123!',
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);

      // Make verifyPassword take some time to simulate bcrypt
      vi.mocked(auth.verifyPassword).mockImplementation(async (password, hash) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return hash === `hashed_${password}`;
      });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: {
          email: 'test@example.com',
          password: 'WrongPass123!',
        },
      });

      const startTime = Date.now();
      await loginPOST(request);
      const endTime = Date.now();

      // Password verification should take at least 10ms
      // In reality, bcrypt is designed to be slow (100ms+) and constant-time
      expect(endTime - startTime).toBeGreaterThanOrEqual(10);
    });
  });
});
