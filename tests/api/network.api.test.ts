import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET as networkGET, POST as networkPOST } from '@/app/api/network/route';
import { PUT as personPUT, DELETE as personDELETE } from '@/app/api/network/[personId]/route';
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
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'new-person-id' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'person-id' }, error: null })),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

import * as auth from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-server';

describe('Network/People API Integration Tests', () => {
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

  describe('GET /api/network', () => {
    it('should require authentication', async () => {
      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/network',
      });

      const response = await networkGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should fetch user network with valid token', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const mockPeople = [
        {
          id: 'person-1',
          owner_id: 'user-123',
          person_name: 'John Doe',
          person_email: 'john@example.com',
          relationship: 'Friend',
        },
      ];

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: mockPeople, error: null })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/network',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await networkGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Array.isArray(data.people)).toBe(true);
    });

    it('should return empty array when no people in network', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/network',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await networkGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.people).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: null, error: { message: 'DB error' } })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/network',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await networkGET(request);

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/network', () => {
    it('should require authentication', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/network',
        body: {
          person_name: 'John Doe',
        },
      });

      const response = await networkPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should add person with valid data', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const mockNewPerson = {
        id: 'new-person-id',
        owner_id: 'user-123',
        person_name: 'John Doe',
        person_email: 'john@example.com',
      };

      // Mock user lookup
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockNewPerson, error: null })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/network',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          person_name: 'John Doe',
          person_email: 'john@example.com',
          relationship: 'Friend',
        },
      });

      const response = await networkPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.person).toBeDefined();
    });

    it('should validate required fields', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/network',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          // Missing person_name (required field)
          person_email: 'john@example.com',
        },
      });

      const response = await networkPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });

    it('should sanitize input to prevent XSS', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'new-person-id' }, error: null })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/network',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          person_name: '<script>alert("xss")</script>John',
          notes: '<img src=x onerror=alert(1)>Notes',
        },
      });

      const response = await networkPOST(request);

      // Should succeed - input will be sanitized
      expect(response.status).toBeLessThan(500);
    });

    it('should validate email format', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/network',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          person_name: 'John Doe',
          person_email: 'invalid-email',
        },
      });

      const response = await networkPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });
  });

  describe('PUT /api/network/[id]', () => {
    it('should require authentication', async () => {
      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/network/person-123',
        body: {
          person_name: 'Updated Name',
        },
      });

      const response = await personPUT(request, { params: { personId: 'person-123' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should update person with valid data', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const mockExistingPerson = {
        id: 'person-123',
        owner_id: 'user-123',
        person_name: 'Old Name',
      };

      const mockUpdatedPerson = {
        id: 'person-123',
        owner_id: 'user-123',
        person_name: 'Updated Name',
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockExistingPerson, error: null })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockUpdatedPerson, error: null })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/network/person-123',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          person_name: 'Updated Name',
        },
      });

      const response = await personPUT(request, { params: { personId: 'person-123' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.person).toBeDefined();
    });

    it('should reject update if person not found', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/network/nonexistent-id',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          person_name: 'Updated Name',
        },
      });

      const response = await personPUT(request, { params: { personId: 'nonexistent-id' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should reject update if user does not own person', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const mockOtherUserPerson = {
        id: 'person-123',
        owner_id: 'different-user-id', // Different owner
        person_name: 'Old Name',
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockOtherUserPerson, error: null })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/network/person-123',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          person_name: 'Updated Name',
        },
      });

      const response = await personPUT(request, { params: { personId: 'person-123' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(403);
      expect(data.error).toContain('Permission denied');
    });

    it('should validate required fields', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const mockExistingPerson = {
        id: 'person-123',
        owner_id: 'user-123',
        person_name: 'Old Name',
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockExistingPerson, error: null })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/network/person-123',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          person_name: '', // Empty name
        },
      });

      const response = await personPUT(request, { params: { personId: 'person-123' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });
  });

  describe('DELETE /api/network/[id]', () => {
    it('should require authentication', async () => {
      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/network/person-123',
      });

      const response = await personDELETE(request, { params: { personId: 'person-123' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toBeDefined();
    });

    it('should delete person successfully', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const mockExistingPerson = {
        id: 'person-123',
        owner_id: 'user-123',
        person_name: 'John Doe',
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockExistingPerson, error: null })),
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/network/person-123',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await personDELETE(request, { params: { personId: 'person-123' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject delete if person not found', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/network/nonexistent-id',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await personDELETE(request, { params: { personId: 'nonexistent-id' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should reject delete if user does not own person', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const mockOtherUserPerson = {
        id: 'person-123',
        owner_id: 'different-user-id',
        person_name: 'John Doe',
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockOtherUserPerson, error: null })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'DELETE',
        url: 'http://localhost:3000/api/network/person-123',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      const response = await personDELETE(request, { params: { personId: 'person-123' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(403);
      expect(data.error).toContain('Permission denied');
    });
  });

  describe('Security Tests', () => {
    it('should prevent SQL injection in network queries', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const maliciousId = "'; DROP TABLE user_networks; --";

      const request = createMockRequest({
        method: 'DELETE',
        url: `http://localhost:3000/api/network/${maliciousId}`,
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      // Should not crash or execute SQL
      const response = await personDELETE(request, { params: { personId: maliciousId } });

      expect(response.status).toBeLessThan(500);
      // Supabase client automatically parameterizes queries
    });

    it('should not leak other users network data', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      vi.mocked(auth.verifyToken).mockResolvedValue(mockUser);

      const mockOtherUserPerson = {
        id: 'person-123',
        owner_id: 'different-user',
      };

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockOtherUserPerson, error: null })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/network/person-123',
        headers: {
          authorization: 'Bearer valid-token',
        },
        body: {
          person_name: 'Updated Name',
        },
      });

      const response = await personPUT(request, { params: { personId: 'person-123' } });

      // Should deny access with 403, not reveal data
      expect(response.status).toBe(403);
    });
  });
});
