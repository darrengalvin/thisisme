import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET as chapterGET } from '@/app/api/chapters/[chapterId]/route';
import { POST as invitePOST } from '@/app/api/chapters/invite/route';
import { POST as addMemberPOST } from '@/app/api/chapters/add-member/route';
import { POST as inviteLinkPOST } from '@/app/api/chapters/invite-link/route';
import { POST as joinPOST } from '@/app/api/chapters/join/route';
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

vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'member-id' }, error: null })),
        })),
      })),
    })),
  },
}));

vi.mock('@/lib/resend', () => ({
  sendChapterInviteEmail: vi.fn(() => Promise.resolve({ success: true })),
}));

import * as auth from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

describe('Chapters/Timeline API Integration Tests', () => {
  let envRestore: { restore: () => void };

  beforeEach(() => {
    envRestore = mockEnvVars({
      JWT_SECRET: 'test-secret',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    envRestore.restore();
  });

  describe('GET /api/chapters/[id]', () => {
    it('should fetch chapter details with valid ID', async () => {
      const mockChapter = {
        id: 'chapter-123',
        title: 'My Chapter',
        description: 'Chapter description',
        user_id: 'user-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockChapter, error: null })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/chapters/chapter-123',
      });

      const response = await chapterGET(request, { params: { chapterId: 'chapter-123' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.chapter).toBeDefined();
      expect(data.chapter.id).toBe('chapter-123');
      expect(data.chapter.title).toBe('My Chapter');
    });

    it('should return 404 when chapter not found', async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: null, 
              error: { code: 'PGRST116', message: 'Not found' } 
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/chapters/nonexistent',
      });

      const response = await chapterGET(request, { params: { chapterId: 'nonexistent' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should handle database errors gracefully', async () => {
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.reject(new Error('Database error'))),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/chapters/chapter-123',
      });

      const response = await chapterGET(request, { params: { chapterId: 'chapter-123' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /api/chapters/invite', () => {
    it('should require authentication', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chapters/invite',
        body: {
          chapterId: 'chapter-123',
          invites: [{ email: 'test@example.com' }],
        },
      });

      const response = await invitePOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should validate required fields', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chapters/invite',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          // Missing chapterId and invites
        },
      });

      const response = await invitePOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should reject invites for non-existent chapter', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

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
        method: 'POST',
        url: 'http://localhost:3000/api/chapters/invite',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          chapterId: 'nonexistent',
          invites: [{ email: 'test@example.com' }],
        },
      });

      const response = await invitePOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should reject invites from non-members', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const mockChapter = {
        id: 'chapter-123',
        title: 'My Chapter',
        timezone_members: [
          { user_id: 'different-user-id' }, // Different user is member, not current user
        ],
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockChapter, error: null })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chapters/invite',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          chapterId: 'chapter-123',
          invites: [{ email: 'test@example.com' }],
        },
      });

      const response = await invitePOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(403);
      expect(data.error).toContain('Access denied');
    });

    it('should validate invites array', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chapters/invite',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          chapterId: 'chapter-123',
          invites: 'not-an-array', // Invalid format
        },
      });

      const response = await invitePOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe('POST /api/chapters/add-member', () => {
    it('should require authentication', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chapters/add-member',
        body: {
          chapterId: 'chapter-123',
          personId: 'person-123',
          personName: 'John Doe',
        },
      });

      const response = await addMemberPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should validate required fields', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chapters/add-member',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          // Missing required fields
          chapterId: 'chapter-123',
        },
      });

      const response = await addMemberPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should reject adding member to non-existent chapter', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

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
        method: 'POST',
        url: 'http://localhost:3000/api/chapters/add-member',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          chapterId: 'nonexistent',
          personId: 'person-123',
          personName: 'John Doe',
        },
      });

      const response = await addMemberPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should reject when user is not a member', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const mockChapter = {
        id: 'chapter-123',
        title: 'My Chapter',
        timezone_members: [
          { user_id: 'different-user-id' },
        ],
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockChapter, error: null })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chapters/add-member',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          chapterId: 'chapter-123',
          personId: 'person-123',
          personName: 'John Doe',
        },
      });

      const response = await addMemberPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(403);
      expect(data.error).toContain('Access denied');
    });
  });

  describe('POST /api/chapters/invite-link', () => {
    it('should require authentication', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chapters/invite-link',
        body: {
          chapterId: 'chapter-123',
        },
      });

      const response = await inviteLinkPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should validate chapter ID', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chapters/invite-link',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          // Missing chapterId
        },
      });

      const response = await inviteLinkPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should reject for non-existent chapter', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

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
        method: 'POST',
        url: 'http://localhost:3000/api/chapters/invite-link',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          chapterId: 'nonexistent',
        },
      });

      const response = await inviteLinkPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should reject when user is not a member', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const mockChapter = {
        id: 'chapter-123',
        title: 'My Chapter',
        timezone_members: [
          { user_id: 'different-user-id' },
        ],
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockChapter, error: null })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chapters/invite-link',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          chapterId: 'chapter-123',
        },
      });

      const response = await inviteLinkPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(403);
      expect(data.error).toContain('Access denied');
    });
  });

  describe('POST /api/chapters/join', () => {
    it('should require authentication', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chapters/join',
        body: {
          chapterId: 'chapter-123',
        },
      });

      const response = await joinPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should validate chapter ID', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chapters/join',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          // Missing chapterId
        },
      });

      const response = await joinPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should reject joining non-existent chapter', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

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
        method: 'POST',
        url: 'http://localhost:3000/api/chapters/join',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          chapterId: 'nonexistent',
        },
      });

      const response = await joinPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });
  });

  describe('Security Tests', () => {
    it('should prevent SQL injection in chapter queries', async () => {
      const maliciousId = "'; DROP TABLE timezones; --";

      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/chapters/${maliciousId}`,
      });

      // Should not crash or execute SQL
      const response = await chapterGET(request, { params: { chapterId: maliciousId } });

      expect(response.status).toBeLessThan(500);
      // Supabase client automatically parameterizes queries
    });

    it('should enforce member-only access for invitations', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const mockChapter = {
        id: 'chapter-123',
        title: 'Private Chapter',
        timezone_members: [
          { user_id: 'different-user-id' }, // User is NOT a member
        ],
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockChapter, error: null })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chapters/invite',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          chapterId: 'chapter-123',
          invites: [{ email: 'test@example.com' }],
        },
      });

      const response = await invitePOST(request);

      // Should deny access with 403, not leak chapter data
      expect(response.status).toBe(403);
    });
  });
});
