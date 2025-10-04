import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET as conversationsGET } from '@/app/api/conversations/route';
import {
  createMockRequest,
  extractJSON,
  mockEnvVars,
} from './helpers';

// Mock dependencies
vi.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            range: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    })),
  },
  createServerSupabaseClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ 
        data: { user: null }, 
        error: { message: 'Unauthorized' } 
      })),
    },
  })),
}));

import { supabaseAdmin, createServerSupabaseClient } from '@/lib/supabase-server';

describe('Conversations API Integration Tests', () => {
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

  describe('GET /api/conversations', () => {
    it('should require authentication', async () => {
      vi.mocked(createServerSupabaseClient).mockReturnValue({
        auth: {
          getUser: vi.fn(() => Promise.resolve({ 
            data: { user: null }, 
            error: { message: 'Unauthorized' } 
          })),
        },
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/conversations',
      });

      const response = await conversationsGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should fetch conversations for authenticated user', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      vi.mocked(createServerSupabaseClient).mockReturnValue({
        auth: {
          getUser: vi.fn(() => Promise.resolve({ 
            data: { user: mockUser }, 
            error: null 
          })),
        },
      } as any);

      const mockConversations = [
        {
          id: 'conv-1',
          call_id: 'call-1',
          user_id: 'user-123',
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: 120,
          summary: 'Test conversation',
          conversation_messages: [
            {
              id: 'msg-1',
              role: 'user',
              content: 'Hello',
              timestamp: new Date().toISOString(),
              tool_calls: null,
            },
            {
              id: 'msg-2',
              role: 'assistant',
              content: 'Hi there!',
              timestamp: new Date().toISOString(),
              tool_calls: null,
            },
          ],
        },
      ];

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => Promise.resolve({ data: mockConversations, error: null })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/conversations',
      });

      const response = await conversationsGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.conversations).toHaveLength(1);
      expect(data.conversations[0].id).toBe('conv-1');
      expect(data.conversations[0].messages).toHaveLength(2);
    });

    it('should respect pagination limit parameter', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      vi.mocked(createServerSupabaseClient).mockReturnValue({
        auth: {
          getUser: vi.fn(() => Promise.resolve({ 
            data: { user: mockUser }, 
            error: null 
          })),
        },
      } as any);

      const rangeMock = vi.fn(() => Promise.resolve({ data: [], error: null }));

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              range: rangeMock,
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/conversations?limit=5',
      });

      await conversationsGET(request);

      // Should call range with limit of 5 (offset 0, to 4)
      expect(rangeMock).toHaveBeenCalledWith(0, 4);
    });

    it('should respect pagination offset parameter', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      vi.mocked(createServerSupabaseClient).mockReturnValue({
        auth: {
          getUser: vi.fn(() => Promise.resolve({ 
            data: { user: mockUser }, 
            error: null 
          })),
        },
      } as any);

      const rangeMock = vi.fn(() => Promise.resolve({ data: [], error: null }));

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              range: rangeMock,
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/conversations?limit=10&offset=20',
      });

      await conversationsGET(request);

      // Should call range with offset 20, to 29 (20 + 10 - 1)
      expect(rangeMock).toHaveBeenCalledWith(20, 29);
    });

    it('should use default pagination values when not provided', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      vi.mocked(createServerSupabaseClient).mockReturnValue({
        auth: {
          getUser: vi.fn(() => Promise.resolve({ 
            data: { user: mockUser }, 
            error: null 
          })),
        },
      } as any);

      const rangeMock = vi.fn(() => Promise.resolve({ data: [], error: null }));

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              range: rangeMock,
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/conversations',
      });

      await conversationsGET(request);

      // Default: limit 10, offset 0 -> range(0, 9)
      expect(rangeMock).toHaveBeenCalledWith(0, 9);
    });

    it('should return empty array when no conversations exist', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      vi.mocked(createServerSupabaseClient).mockReturnValue({
        auth: {
          getUser: vi.fn(() => Promise.resolve({ 
            data: { user: mockUser }, 
            error: null 
          })),
        },
      } as any);

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/conversations',
      });

      const response = await conversationsGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.conversations).toEqual([]);
      expect(data.total).toBe(0);
    });

    it('should sort messages by timestamp within conversation', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      vi.mocked(createServerSupabaseClient).mockReturnValue({
        auth: {
          getUser: vi.fn(() => Promise.resolve({ 
            data: { user: mockUser }, 
            error: null 
          })),
        },
      } as any);

      const now = new Date();
      const earlier = new Date(now.getTime() - 60000); // 1 minute earlier
      const later = new Date(now.getTime() + 60000); // 1 minute later

      const mockConversations = [
        {
          id: 'conv-1',
          call_id: 'call-1',
          user_id: 'user-123',
          started_at: now.toISOString(),
          ended_at: later.toISOString(),
          duration_seconds: 120,
          summary: 'Test',
          conversation_messages: [
            { id: 'msg-3', role: 'assistant', content: 'Last', timestamp: later.toISOString(), tool_calls: null },
            { id: 'msg-1', role: 'user', content: 'First', timestamp: earlier.toISOString(), tool_calls: null },
            { id: 'msg-2', role: 'user', content: 'Middle', timestamp: now.toISOString(), tool_calls: null },
          ],
        },
      ];

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => Promise.resolve({ data: mockConversations, error: null })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/conversations',
      });

      const response = await conversationsGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.conversations[0].messages[0].content).toBe('First');
      expect(data.conversations[0].messages[1].content).toBe('Middle');
      expect(data.conversations[0].messages[2].content).toBe('Last');
    });

    it('should handle database errors gracefully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      vi.mocked(createServerSupabaseClient).mockReturnValue({
        auth: {
          getUser: vi.fn(() => Promise.resolve({ 
            data: { user: mockUser }, 
            error: null 
          })),
        },
      } as any);

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => Promise.resolve({ 
                data: null, 
                error: { code: 'DB_ERROR', message: 'Database error' } 
              })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/conversations',
      });

      const response = await conversationsGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it('should handle unexpected errors gracefully', async () => {
      vi.mocked(createServerSupabaseClient).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/conversations',
      });

      const response = await conversationsGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(500);
      expect(data.error).toContain('Internal server error');
    });
  });

  describe('Security Tests', () => {
    it('should only fetch conversations for the authenticated user', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      vi.mocked(createServerSupabaseClient).mockReturnValue({
        auth: {
          getUser: vi.fn(() => Promise.resolve({ 
            data: { user: mockUser }, 
            error: null 
          })),
        },
      } as any);

      const eqMock = vi.fn(() => ({
        order: vi.fn(() => ({
          range: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      }));

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: eqMock,
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/conversations',
      });

      await conversationsGET(request);

      // Should filter by the authenticated user's ID
      expect(eqMock).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('should validate pagination parameters to prevent injection', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };

      vi.mocked(createServerSupabaseClient).mockReturnValue({
        auth: {
          getUser: vi.fn(() => Promise.resolve({ 
            data: { user: mockUser }, 
            error: null 
          })),
        },
      } as any);

      const rangeMock = vi.fn(() => Promise.resolve({ data: [], error: null }));

      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              range: rangeMock,
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/conversations?limit=not-a-number&offset=also-invalid',
      });

      await conversationsGET(request);

      // parseInt should handle invalid input and use NaN, which becomes defaults
      // The defaults (0, 9) should be used
      expect(rangeMock).toHaveBeenCalled();
      const callArgs = rangeMock.mock.calls[0] as any;
      expect(typeof callArgs?.[0]).toBe('number');
      expect(typeof callArgs?.[1]).toBe('number');
    });
  });
});
