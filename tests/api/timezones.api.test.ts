import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET as timezonesGET, POST as timezonesPOST } from '@/app/api/timezones/route';
import { PUT as timezonePUT, DELETE as timezoneDELETE } from '@/app/api/timezones/[id]/route';
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
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'chapter-1' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'chapter-1' }, error: null })),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  })),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => null),
  })),
}));

vi.mock('@/lib/utils', () => ({
  generateInviteCode: vi.fn(() => 'INVITE123'),
}));

import * as auth from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

describe('Timezones/Chapters API Integration Tests', () => {
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

  describe('GET /api/timezones', () => {
    it('should require authentication', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/timezones',
      });

      const response = await timezonesGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toContain('Authentication required');
    });

    it('should reject invalid token', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue(null);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/timezones',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      const response = await timezonesGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid token');
    });
  });

  describe('POST /api/timezones', () => {
    it('should require authentication', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/timezones',
        body: {
          title: 'Test Chapter',
        },
      });

      const response = await timezonesPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toContain('Authentication required');
    });

    it('should reject invalid token', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue(null);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/timezones',
        headers: {
          authorization: 'Bearer invalid-token',
        },
        body: {
          title: 'Test Chapter',
        },
      });

      const response = await timezonesPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid token');
    });

    it('should require title field', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { id: 'user-123' }, error: null })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/timezones',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          // Missing title
          type: 'personal',
        },
      });

      const response = await timezonesPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('Title');
    });

    it('should verify user exists before creating chapter', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      // Mock user doesn't exist
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/timezones',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          title: 'Test Chapter',
          type: 'personal',
        },
      });

      const response = await timezonesPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('User profile not found');
    });
  });

  describe('PUT /api/timezones/[id]', () => {
    it('should require authentication', async () => {
      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/timezones/chapter-1',
        body: {
          title: 'Updated Chapter',
        },
      });

      const response = await timezonePUT(request, { params: { id: 'chapter-1' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toContain('Authentication required');
    });

    it('should reject non-existent chapter', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/timezones/nonexistent',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          title: 'Updated Chapter',
        },
      });

      // Mock FormData since PUT expects it
      Object.defineProperty(request, 'formData', {
        value: async () => {
          const fd = new FormData();
          fd.append('title', 'Updated Chapter');
          return fd;
        },
      });

      const response = await timezonePUT(request, { params: { id: 'nonexistent' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(404);
      expect(data.error).toContain('Chapter not found');
    });

    it('should reject updates from non-creator', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      // Mock chapter exists but owned by different user
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { 
                  id: 'chapter-1', 
                  creator_id: 'different-user' // Different creator
                }, 
                error: null 
              })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/timezones/chapter-1',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          title: 'Updated Chapter',
        },
      });

      Object.defineProperty(request, 'formData', {
        value: async () => {
          const fd = new FormData();
          fd.append('title', 'Updated Chapter');
          return fd;
        },
      });

      const response = await timezonePUT(request, { params: { id: 'chapter-1' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(403);
      expect(data.error).toContain('Permission denied');
    });
  });

  describe('DELETE /api/timezones/[id]', () => {
    it('should require authentication', async () => {
      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/timezones/chapter-1',
      });

      const response = await timezoneDELETE(request, { params: { id: 'chapter-1' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toContain('Authentication required');
    });

    it('should reject deletion of non-existent chapter', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/timezones/nonexistent',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await timezoneDELETE(request, { params: { id: 'nonexistent' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(404);
      expect(data.error).toContain('Chapter not found');
    });

    it('should reject deletion by non-creator', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { 
                  id: 'chapter-1', 
                  creator_id: 'different-user',
                  title: 'Chapter Title'
                }, 
                error: null 
              })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/timezones/chapter-1',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await timezoneDELETE(request, { params: { id: 'chapter-1' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(403);
      expect(data.error).toContain('Permission denied');
    });
  });

  describe('Security Tests', () => {
    it('should only allow creator to update chapter', async () => {
      const creatorId = 'user-123';
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: creatorId, 
        email: 'test@example.com' 
      });

      const fetchMock = vi.fn(() => Promise.resolve({ 
        data: { 
          id: 'chapter-1', 
          creator_id: creatorId // Same creator
        }, 
        error: null 
      }));

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: fetchMock,
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: { id: 'chapter-1' }, error: null })),
              })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/timezones/chapter-1',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          title: 'Updated Chapter',
        },
      });

      Object.defineProperty(request, 'formData', {
        value: async () => {
          const fd = new FormData();
          fd.append('title', 'Updated Chapter');
          return fd;
        },
      });

      await timezonePUT(request, { params: { id: 'chapter-1' } });

      // Should have checked creator_id
      expect(fetchMock).toHaveBeenCalled();
    });

    it('should only allow creator to delete chapter', async () => {
      const creatorId = 'user-123';
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: creatorId, 
        email: 'test@example.com' 
      });

      const fetchMock = vi.fn(() => Promise.resolve({ 
        data: { 
          id: 'chapter-1', 
          creator_id: creatorId,
          title: 'Chapter'
        }, 
        error: null 
      }));

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: fetchMock,
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/timezones/chapter-1',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      await timezoneDELETE(request, { params: { id: 'chapter-1' } });

      // Should have checked creator_id
      expect(fetchMock).toHaveBeenCalled();
    });

    it('should validate chapter ID format', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        })),
      } as any);

      // Attempt SQL injection in ID
      const maliciousId = "1' OR '1'='1";

      const request = createMockRequest({
        method: 'DELETE',
        url: `http://localhost:3000/api/timezones/${maliciousId}`,
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await timezoneDELETE(request, { params: { id: maliciousId } });

      // Should handle gracefully (ID won't match any chapters)
      expect(response.status).toBeLessThan(500);
    });
  });
});
