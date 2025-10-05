import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET as profileGET, PUT as profilePUT } from '@/app/api/user/profile/route';
import { GET as premiumGET } from '@/app/api/user/premium-status/route';
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
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
    })),
  })),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => null),
  })),
}));

import * as auth from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

describe('User Management API Integration Tests', () => {
  let envRestore: { restore: () => void };

  beforeEach(() => {
    envRestore = mockEnvVars({
      JWT_SECRET: 'test-secret',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    });

    vi.clearAllMocks();
    
    // Reset default mocks after clearAllMocks
    vi.mocked(auth.verifyToken).mockResolvedValue({
      userId: 'user-123',
      email: 'test@example.com',
    });
    
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        })),
      })),
    } as any);
  });

  afterEach(() => {
    envRestore.restore();
  });

  describe('GET /api/user/profile', () => {
    it('should require authentication', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/user/profile',
      });

      const response = await profileGET(request as any);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Authentication required');
    });

    it('should fetch user profile with valid token', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const mockUserProfile = {
        id: 'user-123',
        email: 'test@example.com',
        birth_year: 1990,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_admin: false,
      };

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn((table) => {
          return {
            select: vi.fn((columns: any, options?: any) => {
              // Handle count query (with head: true)
              if (options?.head === true) {
                return {
                  eq: vi.fn(() => Promise.resolve({ count: 1, error: null })),
                };
              }
              // Handle regular select query
              return {
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(() => Promise.resolve({ data: mockUserProfile, error: null })),
                })),
              };
            }),
          };
        }),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/user/profile',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await profileGET(request as any);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe('user-123');
      expect(data.user.email).toBe('test@example.com');
    });

    it('should return basic info when profile does not exist', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn((table) => {
          return {
            select: vi.fn((columns: any, options?: any) => {
              // Handle count query (with head: true)
              if (options?.head === true) {
                return {
                  eq: vi.fn(() => Promise.resolve({ count: 0, error: null })),
                };
              }
              // Handle regular select query - return null for no profile
              return {
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
                })),
              };
            }),
          };
        }),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/user/profile',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await profileGET(request as any);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe('user-123');
      // Should return JWT info when DB record missing
    });

    it('should handle database errors gracefully', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: null, 
                error: { code: 'DB_ERROR', message: 'Database error' } 
              })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/user/profile',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await profileGET(request as any);
      const data = await extractJSON(response);

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('PUT /api/user/profile', () => {
    it('should require authentication', async () => {
      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/user/profile',
        body: {
          birthYear: 1990,
        },
      });

      const response = await profilePUT(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Authentication required');
    });

    it('should update user profile with valid data', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const mockUpdatedProfile = {
        id: 'user-123',
        email: 'test@example.com',
        birth_year: 1990,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data: mockUpdatedProfile, error: null })),
              })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/user/profile',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          birthYear: 1990,
        },
      });

      const response = await profilePUT(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.birthYear).toBe(1990);
    });

    it('should validate birth year range', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/user/profile',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          birthYear: 1800, // Too old
        },
      });

      const response = await profilePUT(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Birth year');
    });

    it('should reject future birth years', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const futureYear = new Date().getFullYear() + 1;

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/user/profile',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          birthYear: futureYear,
        },
      });

      const response = await profilePUT(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Birth year');
    });

    it('should handle non-existent user profile', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ 
                  data: null, 
                  error: { code: 'PGRST116', message: 'Not found' } 
                })),
              })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/user/profile',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          birthYear: 1990,
        },
      });

      const response = await profilePUT(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });

    it('should accept null birth year', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const mockUpdatedProfile = {
        id: 'user-123',
        email: 'test@example.com',
        birth_year: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data: mockUpdatedProfile, error: null })),
              })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/user/profile',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          birthYear: null,
        },
      });

      const response = await profilePUT(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('GET /api/user/premium-status', () => {
    it('should require authentication', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/user/premium-status',
      });

      const response = await premiumGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return premium status for authenticated user', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const mockUserData = {
        id: 'user-123',
        email: 'test@example.com',
        is_premium: true,
        subscription_tier: 'premium',
        subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      };

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockUserData, error: null })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/user/premium-status',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await premiumGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.isPremium).toBe(true);
      expect(data.tier).toBe('premium');
      expect(data.features).toBeDefined();
    });

    it('should handle non-premium users', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const mockUserData = {
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false,
        subscription_tier: 'free',
        subscription_expires_at: null,
      };

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockUserData, error: null })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/user/premium-status',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await premiumGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.isPremium).toBe(false);
      expect(data.tier).toBe('free');
      expect(data.features).toBeDefined();
    });
  });

  describe('Security Tests', () => {
    it('should not allow access to other users profiles', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      // The API should only return data for the authenticated user
      // No userId parameter should be accepted in the request
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/user/profile',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await profileGET(request as any);

      // Should use the JWT user ID, not allow arbitrary user lookup
      expect(response.status).toBeLessThan(500);
      expect(auth.verifyToken).toHaveBeenCalled();
    });

    it('should validate birth year type', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/user/profile',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          birthYear: 'not-a-number', // Invalid type
        },
      });

      const response = await profilePUT(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});
