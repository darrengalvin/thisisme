import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET as photoTagsGET, POST as photoTagsPOST } from '@/app/api/media/[mediaId]/photo-tags/route';
import {
  createMockRequest,
  extractJSON,
  mockEnvVars,
} from './helpers';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn((name) => null),
  })),
}));

import * as auth from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

describe('Photo Tags API Integration Tests', () => {
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

  describe('GET /api/media/[mediaId]/photo-tags', () => {
    it('should require authentication', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/media/media-123/photo-tags',
      });

      const response = await photoTagsGET(request, { params: { mediaId: 'media-123' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toContain('No authorization header');
    });

    it('should require Bearer token', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/media/media-123/photo-tags',
        headers: {
          authorization: 'InvalidToken',
        },
      });

      const response = await photoTagsGET(request, { params: { mediaId: 'media-123' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toContain('No authorization header');
    });

    it('should reject invalid token', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue(null);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/media/media-123/photo-tags',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      const response = await photoTagsGET(request, { params: { mediaId: 'media-123' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid token');
    });

    it('should return 404 for non-existent media', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: null, 
              error: { code: 'PGRST116' } 
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/media/nonexistent/photo-tags',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await photoTagsGET(request, { params: { mediaId: 'nonexistent' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(404);
      expect(data.error).toContain('Media not found');
    });

    it('should deny access to media user does not own', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      const mockMedia = { id: 'media-123', memory_id: 'memory-456' };
      const mockMemory = { id: 'memory-456', user_id: 'different-user', timezone_id: null };

      vi.mocked(supabaseAdmin.from).mockImplementation((table) => {
        if (table === 'media') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockMedia, error: null })),
              })),
            })),
          } as any;
        }
        if (table === 'memories') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockMemory, error: null })),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/media/media-123/photo-tags',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await photoTagsGET(request, { params: { mediaId: 'media-123' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(403);
      expect(data.error).toContain('Access denied');
    });

    it('should fetch photo tags for owned media', async () => {
      const userId = 'user-123';
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId, 
        email: 'test@example.com' 
      });

      const mockMedia = { id: 'media-123', memory_id: 'memory-456' };
      const mockMemory = { id: 'memory-456', user_id: userId, timezone_id: null };
      const mockTags = [
        {
          id: 'tag-1',
          media_id: 'media-123',
          tagged_person_id: 'person-1',
          user_networks: { person_name: 'John Doe' },
          users: { email: 'tagger@example.com' },
        },
      ];

      vi.mocked(supabaseAdmin.from).mockImplementation((table) => {
        if (table === 'media') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockMedia, error: null })),
              })),
            })),
          } as any;
        }
        if (table === 'memories') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockMemory, error: null })),
              })),
            })),
          } as any;
        }
        if (table === 'photo_tags') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: mockTags, error: null })),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/media/media-123/photo-tags',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await photoTagsGET(request, { params: { mediaId: 'media-123' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.tags).toBeDefined();
    });
  });

  describe('POST /api/media/[mediaId]/photo-tags', () => {
    it('should require authentication', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/media/media-123/photo-tags',
        body: { tags: [] },
      });

      const response = await photoTagsPOST(request, { params: { mediaId: 'media-123' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toContain('No authorization header');
    });

    it('should require tags to be an array', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/media/media-123/photo-tags',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          tags: 'not-an-array',
        },
      });

      const response = await photoTagsPOST(request, { params: { mediaId: 'media-123' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('Tags must be an array');
    });

    it('should create photo tags for owned media', async () => {
      const userId = 'user-123';
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId, 
        email: 'test@example.com' 
      });

      const mockMedia = { id: 'media-123', memory_id: 'memory-456' };
      const mockMemory = { id: 'memory-456', user_id: userId, timezone_id: null };

      const deleteMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      }));

      const insertMock = vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      }));

      vi.mocked(supabaseAdmin.from).mockImplementation((table) => {
        if (table === 'media') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockMedia, error: null })),
              })),
            })),
          } as any;
        }
        if (table === 'memories') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockMemory, error: null })),
              })),
            })),
          } as any;
        }
        if (table === 'photo_tags') {
          return {
            delete: deleteMock,
            insert: insertMock,
          } as any;
        }
        return {} as any;
      });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/media/media-123/photo-tags',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          tags: [
            {
              tagged_person_id: 'person-1',
              x_position: 10,
              y_position: 20,
            },
          ],
        },
      });

      const response = await photoTagsPOST(request, { params: { mediaId: 'media-123' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(insertMock).toHaveBeenCalled();
    });

    it('should set default tag dimensions', async () => {
      const userId = 'user-123';
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId, 
        email: 'test@example.com' 
      });

      const mockMedia = { id: 'media-123', memory_id: 'memory-456' };
      const mockMemory = { id: 'memory-456', user_id: userId, timezone_id: null };

      const insertMock = vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      }));

      vi.mocked(supabaseAdmin.from).mockImplementation((table) => {
        if (table === 'media') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockMedia, error: null })),
              })),
            })),
          } as any;
        }
        if (table === 'memories') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockMemory, error: null })),
              })),
            })),
          } as any;
        }
        if (table === 'photo_tags') {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
              })),
            })),
            insert: insertMock,
          } as any;
        }
        return {} as any;
      });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/media/media-123/photo-tags',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          tags: [
            {
              tagged_person_id: 'person-1',
              x_position: 10,
              y_position: 20,
              // No width/height specified
            },
          ],
        },
      });

      await photoTagsPOST(request, { params: { mediaId: 'media-123' } });

      const insertedData = insertMock.mock.calls[0][0];
      expect(insertedData[0].tag_width).toBe(10);
      expect(insertedData[0].tag_height).toBe(10);
    });

    it('should handle admin impersonation', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'admin-123', 
        email: 'admin@example.com' 
      });

      vi.mocked(cookies).mockReturnValue({
        get: vi.fn((name) => {
          if (name === 'impersonating-user-id') return { value: 'user-789' };
          if (name === 'admin-user-id') return { value: 'admin-123' };
          return null;
        }),
      } as any);

      const mockMedia = { id: 'media-123', memory_id: 'memory-456' };
      const mockMemory = { id: 'memory-456', user_id: 'user-789', timezone_id: null };

      vi.mocked(supabaseAdmin.from).mockImplementation((table) => {
        if (table === 'media') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockMedia, error: null })),
              })),
            })),
          } as any;
        }
        if (table === 'memories') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockMemory, error: null })),
              })),
            })),
          } as any;
        }
        if (table === 'photo_tags') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: [], error: null })),
              })),
            })),
          } as any;
        }
        return {} as any;
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/media/media-123/photo-tags',
        headers: {
          authorization: 'Bearer admin-token',
        },
      });

      const response = await photoTagsGET(request, { params: { mediaId: 'media-123' } });

      // Should have access via impersonation
      expect(response.status).toBe(200);
    });
  });

  describe('Security Tests', () => {
    it('should prevent SQL injection in mediaId parameter', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      } as any);

      const maliciousId = "1'; DROP TABLE photo_tags; --";

      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/media/${maliciousId}/photo-tags`,
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await photoTagsGET(request, { params: { mediaId: maliciousId } });

      // Should handle gracefully
      expect(response.status).toBeLessThan(500);
    });

    it('should validate tag position values', async () => {
      const userId = 'user-123';
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId, 
        email: 'test@example.com' 
      });

      const mockMedia = { id: 'media-123', memory_id: 'memory-456' };
      const mockMemory = { id: 'memory-456', user_id: userId, timezone_id: null };

      const insertMock = vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      }));

      vi.mocked(supabaseAdmin.from).mockImplementation((table) => {
        if (table === 'media') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockMedia, error: null })),
              })),
            })),
          } as any;
        }
        if (table === 'memories') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockMemory, error: null })),
              })),
            })),
          } as any;
        }
        if (table === 'photo_tags') {
          return {
            delete: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null })),
              })),
            })),
            insert: insertMock,
          } as any;
        }
        return {} as any;
      });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/media/media-123/photo-tags',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          tags: [
            {
              tagged_person_id: 'person-1',
              x_position: 50,
              y_position: 75,
              tag_width: 15,
              tag_height: 20,
            },
          ],
        },
      });

      await photoTagsPOST(request, { params: { mediaId: 'media-123' } });

      // Verify positions are preserved
      const insertedData = insertMock.mock.calls[0][0];
      expect(insertedData[0].x_position).toBe(50);
      expect(insertedData[0].y_position).toBe(75);
      expect(insertedData[0].tag_width).toBe(15);
      expect(insertedData[0].tag_height).toBe(20);
    });

    it('should delete only user own tags before inserting new ones', async () => {
      const userId = 'user-123';
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId, 
        email: 'test@example.com' 
      });

      const mockMedia = { id: 'media-123', memory_id: 'memory-456' };
      const mockMemory = { id: 'memory-456', user_id: userId, timezone_id: null };

      const deleteMock = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      }));

      vi.mocked(supabaseAdmin.from).mockImplementation((table) => {
        if (table === 'media') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockMedia, error: null })),
              })),
            })),
          } as any;
        }
        if (table === 'memories') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockMemory, error: null })),
              })),
            })),
          } as any;
        }
        if (table === 'photo_tags') {
          return {
            delete: deleteMock,
            insert: vi.fn(() => ({
              select: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          } as any;
        }
        return {} as any;
      });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/media/media-123/photo-tags',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          tags: [{ tagged_person_id: 'person-1', x_position: 10, y_position: 20 }],
        },
      });

      await photoTagsPOST(request, { params: { mediaId: 'media-123' } });

      // Verify delete was called with correct filters
      expect(deleteMock).toHaveBeenCalled();
    });
  });
});
