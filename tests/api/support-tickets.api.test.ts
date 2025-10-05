import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET as ticketsGET, POST as ticketsPOST } from '@/app/api/support/tickets/route';
import { GET as ticketGET, PUT as ticketPUT } from '@/app/api/support/tickets/[id]/route';
import { POST as commentsPOST } from '@/app/api/support/tickets/[id]/comments/route';
import {
  createMockRequest,
  extractJSON,
  mockEnvVars,
} from './helpers';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          or: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'ticket-1' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'ticket-1' }, error: null })),
          })),
        })),
      })),
    })),
  })),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn((name) => {
      if (name === 'auth-token') {
        return { value: 'valid-token' };
      }
      return null;
    }),
  })),
}));

import * as auth from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

describe('Support Tickets API Integration Tests', () => {
  let envRestore: { restore: () => void };

  beforeEach(() => {
    envRestore = mockEnvVars({
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    });

    vi.clearAllMocks();
    
    // Reset default cookies mock after clearAllMocks
    vi.mocked(cookies).mockReturnValue({
      get: vi.fn((name) => {
        if (name === 'auth-token') {
          return { value: 'valid-token' };
        }
        return null;
      }),
    } as any);
    
    // Reset default auth mock
    vi.mocked(auth.verifyToken).mockResolvedValue({ 
      userId: 'user-123', 
      email: 'test@example.com' 
    });
  });

  afterEach(() => {
    envRestore.restore();
  });

  describe('GET /api/support/tickets', () => {
    it('should require authentication', async () => {
      vi.mocked(cookies).mockReturnValue({
        get: vi.fn(() => null), // No auth token
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/support/tickets',
      });

      const response = await ticketsGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should reject invalid token', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue(null);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/support/tickets',
      });

      const response = await ticketsGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid token');
    });

    it('should fetch tickets for authenticated user', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      const mockUser = { id: 'user-123', is_admin: false };
      const mockTickets = [
        {
          id: 'ticket-1',
          title: 'Test Ticket',
          status: 'open',
          priority: 'high',
          creator_id: 'user-123',
        },
      ];

      const orMock = vi.fn(() => Promise.resolve({ data: mockTickets, error: null }));

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn((table) => {
          if (table === 'users') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: mockUser, error: null })),
                })),
              })),
            };
          }
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => ({
                or: orMock,
              })),
            })),
          };
        }),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/support/tickets',
      });

      const response = await ticketsGET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.tickets).toBeDefined();
    });

    it('should allow admins to see all tickets', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'admin-123', 
        email: 'admin@example.com' 
      });

      const mockUser = { id: 'admin-123', is_admin: true };

      const orderMock = vi.fn(() => Promise.resolve({ data: [], error: null }));

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn((table) => {
          if (table === 'users') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: mockUser, error: null })),
                })),
              })),
            };
          }
          return {
            select: vi.fn(() => ({
              order: orderMock,
              eq: vi.fn((field, value) => ({
                order: orderMock,
              })),
            })),
          };
        }),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/support/tickets',
      });

      await ticketsGET(request);

      // Admin should not have .or() filter applied
      expect(orderMock).toHaveBeenCalled();
    });

    it('should filter tickets by status', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      const mockUser = { id: 'user-123', is_admin: false };

      const eqMock = vi.fn(() => Promise.resolve({ data: [], error: null }));

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn((table) => {
          if (table === 'users') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: mockUser, error: null })),
                })),
              })),
            };
          }
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => ({
                or: vi.fn(() => ({
                  eq: eqMock,
                })),
              })),
            })),
          };
        }),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/support/tickets?status=open',
      });

      await ticketsGET(request);

      // Should filter by status
      expect(eqMock).toHaveBeenCalledWith('status', 'open');
    });
  });

  describe('POST /api/support/tickets', () => {
    it('should require authentication', async () => {
      vi.mocked(cookies).mockReturnValue({
        get: vi.fn(() => null),
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/support/tickets',
        body: {
          title: 'Test Ticket',
          description: 'Test description',
        },
      });

      const response = await ticketsPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should require title and description', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/support/tickets',
        body: {
          // Missing title and description
        },
      });

      const response = await ticketsPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('Title and description are required');
    });

    it('should create ticket with valid data', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      const mockTicket = {
        id: 'ticket-1',
        title: 'Test Ticket',
        description: 'Test description',
        status: 'open',
        stage: 'backlog',
        creator_id: 'user-123',
      };

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockTicket, error: null })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/support/tickets',
        body: {
          title: 'Test Ticket',
          description: 'Test description',
          priority: 'high',
          category: 'bug',
        },
      });

      const response = await ticketsPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(201);
      expect(data.ticket).toBeDefined();
      expect(data.ticket.id).toBe('ticket-1');
    });

    it('should set default priority and category', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      let capturedInsertData: any = null;
      const insertMock = vi.fn((data) => {
        capturedInsertData = data;
        return {
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'ticket-1', ...data }, error: null })),
          })),
        };
      });

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          insert: insertMock,
        })),
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/support/tickets',
        body: {
          title: 'Test Ticket',
          description: 'Test description',
          // No priority or category specified
        },
      });

      await ticketsPOST(request);

      // Should have been called with default values
      expect(capturedInsertData?.priority).toBe('medium');
      expect(capturedInsertData?.category).toBe('question');
      expect(capturedInsertData?.status).toBe('open');
      expect(capturedInsertData?.stage).toBe('backlog');
    });
  });

  describe('GET /api/support/tickets/[id]', () => {
    it('should require authentication', async () => {
      vi.mocked(cookies).mockReturnValue({
        get: vi.fn(() => null),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/support/tickets/ticket-1',
      });

      const response = await ticketGET(request, { params: { id: 'ticket-1' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should return 404 for non-existent ticket', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: null, 
                error: { code: 'PGRST116', message: 'Not found' } 
              })),
            })),
          })),
        })),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/support/tickets/nonexistent',
      });

      const response = await ticketGET(request, { params: { id: 'nonexistent' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(404);
      expect(data.error).toContain('Ticket not found');
    });
  });

  describe('PUT /api/support/tickets/[id]', () => {
    it('should require authentication', async () => {
      vi.mocked(cookies).mockReturnValue({
        get: vi.fn(() => null),
      } as any);

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/support/tickets/ticket-1',
        body: {
          status: 'resolved',
        },
      });

      const response = await ticketPUT(request, { params: { id: 'ticket-1' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should reject updates from unauthorized users', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      const mockUser = { id: 'user-123', is_admin: false };
      const mockTicket = {
        creator_id: 'different-user',
        assignee_id: 'another-user',
      };

      let callCount = 0;
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn((table) => {
          callCount++;
          // First call is for users, second call is for tickets
          if (callCount === 1) {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: mockUser, error: null })),
                })),
              })),
            };
          }
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: mockTicket, error: null })),
              })),
            })),
          };
        }),
      } as any);

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/support/tickets/ticket-1',
        body: {
          status: 'resolved',
        },
      });

      const response = await ticketPUT(request, { params: { id: 'ticket-1' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(403);
      expect(data.error).toContain('Unauthorized');
    });

    it('should allow creator to update their ticket', async () => {
      const userId = 'user-123';
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId, 
        email: 'test@example.com' 
      });

      const mockUser = { id: userId, is_admin: false };
      const mockTicket = {
        creator_id: userId, // Same user
        assignee_id: null,
      };

      let callCount = 0;
      vi.mocked(createClient).mockReturnValue({
        from: vi.fn((table) => {
          callCount++;
          // First call: user fetch, second call: ticket fetch, third call: update
          if (callCount === 1) {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: mockUser, error: null })),
                })),
              })),
            };
          } else if (callCount === 2) {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: mockTicket, error: null })),
                })),
              })),
            };
          } else {
            return {
              update: vi.fn(() => ({
                eq: vi.fn(() => ({
                  select: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({ data: { id: 'ticket-1', status: 'resolved' }, error: null })),
                  })),
                })),
              })),
            };
          }
        }),
      } as any);

      const request = createMockRequest({
        method: 'PUT',
        url: 'http://localhost:3000/api/support/tickets/ticket-1',
        body: {
          status: 'resolved',
        },
      });

      const response = await ticketPUT(request, { params: { id: 'ticket-1' } });

      expect(response.status).toBeLessThan(400);
    });
  });

  describe('POST /api/support/tickets/[id]/comments', () => {
    it('should require authentication', async () => {
      vi.mocked(cookies).mockReturnValue({
        get: vi.fn(() => null),
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/support/tickets/ticket-1/comments',
        body: {
          comment: 'Test comment',
        },
      });

      const response = await commentsPOST(request, { params: { id: 'ticket-1' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should require comment text', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/support/tickets/ticket-1/comments',
        body: {
          // Missing comment
        },
      });

      const response = await commentsPOST(request, { params: { id: 'ticket-1' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('Comment is required');
    });

    it('should reject internal comments from non-admins', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      const mockUser = { id: 'user-123', email: 'test@example.com', is_admin: false };

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn((table) => {
          if (table === 'users') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: mockUser, error: null })),
                })),
              })),
            };
          }
          return {};
        }),
      } as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/support/tickets/ticket-1/comments',
        body: {
          comment: 'Internal note',
          is_internal: true,
        },
      });

      const response = await commentsPOST(request, { params: { id: 'ticket-1' } });
      const data = await extractJSON(response);

      expect(response.status).toBe(403);
      expect(data.error).toContain('Only admins can post internal comments');
    });
  });

  describe('Security Tests', () => {
    it('should prevent non-creators from accessing others tickets', async () => {
      const userId = 'user-123';
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId, 
        email: 'test@example.com' 
      });

      const mockUser = { id: userId, is_admin: false };

      const orMock = vi.fn(() => Promise.resolve({ data: [], error: null }));

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn((table) => {
          if (table === 'users') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn(() => Promise.resolve({ data: mockUser, error: null })),
                })),
              })),
            };
          }
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => ({
                or: orMock,
              })),
            })),
          };
        }),
      } as any);

      const request = createMockRequest({
        method: 'GET',
        url: 'http://localhost:3000/api/support/tickets',
      });

      await ticketsGET(request);

      // Should filter to only user's tickets
      expect(orMock).toHaveBeenCalledWith(`creator_id.eq.${userId},assignee_id.eq.${userId}`);
    });

    it('should validate ticket ID format', async () => {
      vi.mocked(auth.verifyToken).mockResolvedValue({ 
        userId: 'user-123', 
        email: 'test@example.com' 
      });

      vi.mocked(createClient).mockReturnValue({
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: null, 
                error: { code: 'PGRST116', message: 'Not found' } 
              })),
            })),
          })),
        })),
      } as any);

      const maliciousId = "1' OR '1'='1";

      const request = createMockRequest({
        method: 'GET',
        url: `http://localhost:3000/api/support/tickets/${maliciousId}`,
      });

      const response = await ticketGET(request, { params: { id: maliciousId } });

      // Should handle gracefully - return 404 for invalid/malicious IDs
      expect(response.status).toBeLessThan(500);
    });
  });
});
