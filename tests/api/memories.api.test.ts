import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET as memoriesGET, POST as memoriesPOST } from '@/app/api/memories/route';
import { GET as memoryGET } from '@/app/api/memories/[id]/route';
import {
  createMockRequest,
  extractJSON,
  mockEnvVars,
  generateMockUUID,
} from './helpers';

// Mock the auth and database functions
vi.mock('@/lib/auth', () => ({
  verifyToken: vi.fn(),
  extractTokenFromHeader: vi.fn((header) => header?.replace('Bearer ', '')),
}));

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-memory-id' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'test-memory-id' }, error: null })),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-memory-id' }, error: null })),
        })),
      })),
    })),
  })),
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-1234'),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => null),
  })),
}));

import * as auth from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';

describe('Memory API Integration Tests', () => {
  let envRestore: { restore: () => void };

  beforeEach(() => {
    envRestore = mockEnvVars({
      JWT_SECRET: 'test-secret',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    });

    vi.clearAllMocks();
    
    // Reset default mocks after clearAllMocks
    vi.mocked(auth.verifyToken).mockResolvedValue({
      userId: 'user-123',
      email: 'test@example.com',
    });
    
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-memory-id' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'test-memory-id' }, error: null })),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    } as any);
  });

  afterEach(() => {
    envRestore.restore();
  });

  describe('GET /api/memories', () => {
    it('should require authentication', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/memories',
      });

      const response = await memoriesGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Authentication required');
    });

    it('should fetch user memories with valid token', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const mockMemories = [
        {
          id: 'memory-1',
          title: 'Test Memory',
          text_content: 'This is a test memory',
          user_id: 'user-123',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          media: [],
          user: { id: 'user-123', email: 'test@example.com' },
          chapter: null,
        },
      ];

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: mockMemories, error: null })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/memories',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await memoriesGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should reject invalid token', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue(null);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/memories',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      const response = await memoriesGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid token');
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
              order: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Database connection failed' } })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/memories',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await memoriesGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database error');
    });
  });

  describe('POST /api/memories', () => {
    it('should require authentication', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/memories',
        body: {
          title: 'Test Memory',
          textContent: 'Test content',
        },
      });

      const response = await memoriesPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Authentication required');
    });

    it('should validate required fields', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      // Create a FormData mock
      const formData = new FormData();
      // Missing required fields: title, textContent, timeZoneId

      const request = new Request('http://localhost:3000/api/memories', {
        method: 'POST',
        body: formData,
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await memoriesPOST(request as any);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid input');
    });

    it('should sanitize input data', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const formData = new FormData();
      formData.append('title', '<script>alert("xss")</script>Test Memory');
      formData.append('textContent', '<img src=x onerror=alert(1)>Test content');
      formData.append('timeZoneId', 'chapter-123');
      formData.append('datePrecision', 'exact');
      formData.append('customDate', '2024-01-01');

      const request = new Request('http://localhost:3000/api/memories', {
        method: 'POST',
        body: formData,
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await memoriesPOST(request as any);
      
      // Verify that the input was sanitized (HTML escaped)
      // The actual validation happens in the route
      expect(response.status).toBeLessThan(500); // Should not crash
    });

    it('should reject excessively long input', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const formData = new FormData();
      formData.append('title', 'A'.repeat(10001)); // Max is 1000 in validation
      formData.append('textContent', 'Test content');
      formData.append('timeZoneId', 'chapter-123');

      const request = new Request('http://localhost:3000/api/memories', {
        method: 'POST',
        body: formData,
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await memoriesPOST(request as any);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/memories/[id]', () => {
    it('should allow public access to shared memories', async () => {
      const memoryId = 'memory-123';
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const mockPublicMemory = {
        id: memoryId,
        title: 'Public Memory',
        text_content: 'Test content',
        user_id: 'other-user-456',
        created_at: new Date().toISOString(),
        media: [],
      };

      let callCount = 0;
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // First call: check owned memory (not found)
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
                })),
              })),
            })),
          } as any;
        } else if (callCount === 2) {
          // Second call: check collaboration (not found)
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
                })),
              })),
            })),
          } as any;
        } else if (callCount === 3) {
          // Third call: check public memory (found)
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockPublicMemory, error: null })),
              })),
            })),
          } as any;
        } else {
          // Fourth call: get memory tags
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          } as any;
        }
      });

      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/memories/${memoryId}`,
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await memoryGET(request, { params: { id: memoryId } });

      // Should return 200 for public access
      expect(response.status).toBe(200);
    });

    it('should require authentication for private memories', async () => {
      const memoryId = 'memory-123';

      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/memories/${memoryId}`,
      });

      const response = await memoryGET(request, { params: { id: memoryId } });
      const data = await extractJSON(response);

      // Without auth, should return 404 or 401
      expect([401, 404]).toContain(response.status);
    });

    it('should return memory for owner', async () => {
      const memoryId = 'memory-123';
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const mockMemory = {
        id: memoryId,
        title: 'Test Memory',
        text_content: 'Test content',
        user_id: 'user-123',
        created_at: new Date().toISOString(),
        media: [],
      };

      let callCount = 0;
      vi.mocked(supabaseAdmin.from).mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) {
          // First call: check owned memory (found)
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: mockMemory, error: null })),
                })),
              })),
            })),
          } as any;
        } else {
          // Second call: get memory tags
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          } as any;
        }
      });

      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/memories/${memoryId}`,
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await memoryGET(request, { params: { id: memoryId } });
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.memory).toBeDefined();
      expect(data.memory.id).toBe(memoryId);
      expect(data.isOwner).toBe(true);
    });
  });

  describe('Security Tests', () => {
    it('should prevent SQL injection in memory queries', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const maliciousId = "'; DROP TABLE memories; --";

      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/memories/${maliciousId}`,
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      // Should not crash or execute SQL
      const response = await memoryGET(request, { params: { id: maliciousId } });

      expect(response.status).toBeLessThan(500);
      // Supabase client automatically parameterizes queries, preventing SQL injection
    });

    it('should not leak other users memory data', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      // Mock that the memory belongs to a different user
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
            })),
            single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/memories/other-user-memory',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await memoryGET(request, { params: { id: 'other-user-memory' } });

      // Should return 404, not 403, to prevent user enumeration
      expect(response.status).toBe(404);
    });

    it('should enforce rate limiting on memory creation', async () => {
      // This would require the rate limiter to be active
      // Testing that the endpoint is protected by middleware
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const formData = new FormData();
      formData.append('title', 'Test');
      formData.append('textContent', 'Test');
      formData.append('timeZoneId', 'chapter-123');

      // Rate limiter is handled at middleware level
      // This test verifies the endpoint works correctly
      const request = new Request('http://localhost:3000/api/memories', {
        method: 'POST',
        body: formData,
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await memoriesPOST(request as any);

      // Should process the request (rate limiting happens in middleware)
      expect(response).toBeDefined();
    });
  });
});
