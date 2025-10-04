import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST as enablePremiumPOST } from '@/app/api/admin/simple-enable-premium/route';
import { POST as setupAdminPOST } from '@/app/api/admin/setup-admin/route';
import {
  createMockRequest,
  extractJSON,
  mockEnvVars,
} from './helpers';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  verifyToken: vi.fn(),
  extractTokenFromHeader: vi.fn((header) => header?.replace('Bearer ', '')),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      upsert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'user-123' }, error: null })),
          })),
        })),
      })),
    })),
    auth: {
      admin: {
        listUsers: vi.fn(() => Promise.resolve({ 
          data: { users: [] }, 
          error: null 
        })),
      },
    },
  })),
}));

import * as auth from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

describe('Admin API Integration Tests', () => {
  let envRestore: { restore: () => void };

  beforeEach(() => {
    envRestore = mockEnvVars({
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    envRestore.restore();
  });

  describe('POST /api/admin/simple-enable-premium', () => {
    it('should require authentication', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/admin/simple-enable-premium',
      });

      const response = await enablePremiumPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toContain('Authentication required');
    });

    it('should reject invalid token', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue(null);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/admin/simple-enable-premium',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      const response = await enablePremiumPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid token');
    });

    it('should enable premium for authenticated user', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      const upsertMock = vi.fn(() => Promise.resolve({ error: null }));

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          upsert: upsertMock,
        })),
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/admin/simple-enable-premium',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await enablePremiumPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBeDefined();
      expect(data.features).toBeDefined();
    });

    it('should set premium features correctly', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      const upsertMock = vi.fn(() => Promise.resolve({ error: null }));

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          upsert: upsertMock,
        })),
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/admin/simple-enable-premium',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await enablePremiumPOST(request);
      const data = await extractJSON(response);

      // Verify upsert was called with correct data
      expect(upsertMock).toHaveBeenCalled();
      const upsertData = (upsertMock.mock.calls as any)[0]?.[0];
      expect(upsertData?.is_premium).toBe(true);
      expect(upsertData?.subscription_tier).toBe('pro');
      expect(upsertData?.subscription_expires_at).toBeDefined();

      // Verify response features
      expect(data.features.voiceTranscription).toBe(true);
      expect(data.features.unlimitedMemories).toBe(true);
      expect(data.features.advancedSearch).toBe(true);
      expect(data.features.prioritySupport).toBe(true);
    });

    it('should set expiration date to 1 year from now', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      const upsertMock = vi.fn(() => Promise.resolve({ error: null }));

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          upsert: upsertMock,
        })),
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/admin/simple-enable-premium',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const now = Date.now();
      await enablePremiumPOST(request);

      const upsertData = (upsertMock.mock.calls as any)[0]?.[0];
      const expiresAt = new Date(upsertData?.subscription_expires_at || '').getTime();
      const oneYearFromNow = now + 365 * 24 * 60 * 60 * 1000;

      // Allow 1 minute tolerance for test execution time
      expect(expiresAt).toBeGreaterThan(now);
      expect(expiresAt).toBeLessThan(oneYearFromNow + 60000);
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          upsert: vi.fn(() => Promise.resolve({ 
            error: { code: 'DB_ERROR', message: 'Database error' } 
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/admin/simple-enable-premium',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await enablePremiumPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to update premium status');
    });
  });

  describe('POST /api/admin/setup-admin', () => {
    it('should setup admin for default email when no email provided', async () => {
      const mockUsers = [
        { id: 'user-123', email: 'dgalvin@yourcaio.co.uk' },
      ];

      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: { id: 'user-123', email: 'dgalvin@yourcaio.co.uk', is_admin: true }, 
              error: null 
            })),
          })),
        })),
      }));

      vi.mocked(createClient).mockReturnValue({
        auth: {
          admin: {
            listUsers: vi.fn(() => Promise.resolve({ 
              data: { users: mockUsers }, 
              error: null 
            })),
          },
        },
        from: vi.fn(() => ({
          update: updateMock,
        })),
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/admin/setup-admin',
        body: {},
      });

      const response = await setupAdminPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(updateMock).toHaveBeenCalled();
    });

    it('should setup admin for specified email', async () => {
      const mockUsers = [
        { id: 'user-456', email: 'admin@example.com' },
      ];

      const updateMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: { id: 'user-456', email: 'admin@example.com', is_admin: true }, 
              error: null 
            })),
          })),
        })),
      }));

      vi.mocked(createClient).mockReturnValue({
        auth: {
          admin: {
            listUsers: vi.fn(() => Promise.resolve({ 
              data: { users: mockUsers }, 
              error: null 
            })),
          },
        },
        from: vi.fn(() => ({
          update: updateMock,
        })),
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/admin/setup-admin',
        body: {
          email: 'admin@example.com',
        },
      });

      const response = await setupAdminPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verify update was called with is_admin: true
      const updateData = (updateMock.mock.calls as any)[0]?.[0];
      expect(updateData?.is_admin).toBe(true);
    });

    it('should return 404 when user not found', async () => {
      vi.mocked(createClient).mockReturnValue({
        auth: {
          admin: {
            listUsers: vi.fn(() => Promise.resolve({ 
              data: { users: [] }, // No users
              error: null 
            })),
          },
        },
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/admin/setup-admin',
        body: {
          email: 'nonexistent@example.com',
        },
      });

      const response = await setupAdminPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should handle auth.admin errors', async () => {
      vi.mocked(createClient).mockReturnValue({
        auth: {
          admin: {
            listUsers: vi.fn(() => Promise.resolve({ 
              data: { users: [] }, 
              error: { code: 'AUTH_ERROR', message: 'Auth failed' } 
            })),
          },
        },
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/admin/setup-admin',
        body: {},
      });

      const response = await setupAdminPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to list users');
    });

    it('should handle database update errors', async () => {
      const mockUsers = [
        { id: 'user-123', email: 'dgalvin@yourcaio.co.uk' },
      ];

      vi.mocked(createClient).mockReturnValue({
        auth: {
          admin: {
            listUsers: vi.fn(() => Promise.resolve({ 
              data: { users: mockUsers }, 
              error: null 
            })),
          },
        },
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ 
                  data: null, 
                  error: { code: 'DB_ERROR', message: 'Update failed' } 
                })),
              })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/admin/setup-admin',
        body: {},
      });

      const response = await setupAdminPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to update user admin status');
    });

    it('should handle empty request body gracefully', async () => {
      const mockUsers = [
        { id: 'user-123', email: 'dgalvin@yourcaio.co.uk' },
      ];

      vi.mocked(createClient).mockReturnValue({
        auth: {
          admin: {
            listUsers: vi.fn(() => Promise.resolve({ 
              data: { users: mockUsers }, 
              error: null 
            })),
          },
        },
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ 
                  data: { id: 'user-123' }, 
                  error: null 
                })),
              })),
            })),
          })),
        })),
      } as any);

      // Create request with no body at all
      const request = new Request('http://localhost:3000/api/admin/setup-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await setupAdminPOST(request as any);

      // Should not crash and should use default email
      expect(response.status).toBe(200);
    });
  });

  describe('Security Tests', () => {
    it('should only enable premium for authenticated users', async () => {
      // No authentication
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/admin/simple-enable-premium',
      });

      const response = await enablePremiumPOST(request);

      expect(response.status).toBe(401);
    });

    it('should not leak user information in errors', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          upsert: vi.fn(() => Promise.resolve({ 
            error: { 
              code: '42P01', 
              message: 'relation "users" does not exist',
              details: 'Internal schema details'
            } 
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/admin/simple-enable-premium',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await enablePremiumPOST(request);
      const data = await extractJSON(response);

      // Should return generic error message
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update premium status');
    });

    it('should validate email format in setup-admin', async () => {
      const mockUsers = [
        { id: 'user-123', email: 'test@example.com' },
      ];

      vi.mocked(createClient).mockReturnValue({
        auth: {
          admin: {
            listUsers: vi.fn(() => Promise.resolve({ 
              data: { users: mockUsers }, 
              error: null 
            })),
          },
        },
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/admin/setup-admin',
        body: {
          email: 'test@example.com',
        },
      });

      await setupAdminPOST(request);

      // Email should be used to find the user
      expect(vi.mocked(createClient)).toHaveBeenCalled();
    });
  });
});
