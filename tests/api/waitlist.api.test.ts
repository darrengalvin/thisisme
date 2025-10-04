import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST as waitlistPOST } from '@/app/api/waitlist/route';
import {
  createMockRequest,
  extractJSON,
  mockEnvVars,
} from './helpers';

// Mock Supabase client
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
          single: vi.fn(() => Promise.resolve({ 
            data: { id: 'waitlist-1', email: 'test@example.com', status: 'pending' }, 
            error: null 
          })),
        })),
      })),
    })),
  })),
}));

import { createClient } from '@supabase/supabase-js';

describe('Waitlist API Integration Tests', () => {
  let envRestore: { restore: () => void };

  beforeEach(() => {
    envRestore = mockEnvVars({
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    });

    vi.clearAllMocks();
    
    // Reset default Supabase mock after clearAllMocks
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: { id: 'waitlist-1', email: 'test@example.com', status: 'pending' }, 
              error: null 
            })),
          })),
        })),
      })),
    } as any);
  });

  afterEach(() => {
    envRestore.restore();
  });

  describe('POST /api/waitlist', () => {
    it('should add valid email to waitlist', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { 
                  id: 'waitlist-1', 
                  email: 'test@example.com', 
                  status: 'pending',
                  created_at: new Date().toISOString()
                }, 
                error: null 
              })),
            })),
          })),
        })),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/waitlist',
        body: {
          email: 'test@example.com',
        },
      });

      const response = await waitlistPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('Successfully added');
      expect(data.entry).toBeDefined();
    });

    it('should require email field', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/waitlist',
        body: {},
      });

      const response = await waitlistPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('email is required');
    });

    it('should validate email format', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/waitlist',
        body: {
          email: 'not-an-email',
        },
      });

      const response = await waitlistPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('Valid email is required');
    });

    it('should normalize email to lowercase', async () => {
      const insertMock = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { id: 'waitlist-1', email: 'test@example.com', status: 'pending' }, 
            error: null 
          })),
        })),
      }));

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
          insert: insertMock,
        })),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/waitlist',
        body: {
          email: 'TEST@EXAMPLE.COM',
        },
      });

      await waitlistPOST(request);

      // Verify insert was called with lowercase email
      expect(insertMock).toHaveBeenCalled();
      const insertedData = insertMock.mock.calls[0][0][0];
      expect(insertedData.email).toBe('test@example.com');
    });

    it('should reject duplicate emails', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { id: 'existing-1', email: 'test@example.com' }, 
                error: null 
              })),
            })),
          })),
          insert: vi.fn(),
        })),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/waitlist',
        body: {
          email: 'test@example.com',
        },
      });

      const response = await waitlistPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(409);
      expect(data.error).toContain('already on waitlist');
    });

    it('should reject duplicate emails case-insensitively', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn((field, value) => ({
              single: vi.fn(() => {
                // If checking for lowercase version, return existing
                if (value === 'test@example.com') {
                  return Promise.resolve({ 
                    data: { id: 'existing-1', email: 'test@example.com' }, 
                    error: null 
                  });
                }
                return Promise.resolve({ data: null, error: null });
              }),
            })),
          })),
          insert: vi.fn(),
        })),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/waitlist',
        body: {
          email: 'TEST@EXAMPLE.COM', // Uppercase version
        },
      });

      const response = await waitlistPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(409);
      expect(data.error).toContain('already on waitlist');
    });

    it('should set status as pending by default', async () => {
      const insertMock = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { id: 'waitlist-1', email: 'test@example.com', status: 'pending' }, 
            error: null 
          })),
        })),
      }));

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
          insert: insertMock,
        })),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/waitlist',
        body: {
          email: 'test@example.com',
        },
      });

      await waitlistPOST(request);

      // Verify status was set to 'pending'
      const insertedData = insertMock.mock.calls[0][0][0];
      expect(insertedData.status).toBe('pending');
    });

    it('should handle database insertion errors', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: null, 
                error: { code: 'DB_ERROR', message: 'Database error' } 
              })),
            })),
          })),
        })),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/waitlist',
        body: {
          email: 'test@example.com',
        },
      });

      const response = await waitlistPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to add to waitlist');
    });

    it('should handle unexpected errors gracefully', async () => {
      vi.mocked(createClient).mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/waitlist',
        body: {
          email: 'test@example.com',
        },
      });

      const response = await waitlistPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(500);
      expect(data.error).toContain('Internal server error');
    });

    it('should accept emails with plus addressing', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { 
                  id: 'waitlist-1', 
                  email: 'test+tag@example.com', 
                  status: 'pending' 
                }, 
                error: null 
              })),
            })),
          })),
        })),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/waitlist',
        body: {
          email: 'test+tag@example.com',
        },
      });

      const response = await waitlistPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should accept emails with subdomains', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { 
                  id: 'waitlist-1', 
                  email: 'test@mail.example.com', 
                  status: 'pending' 
                }, 
                error: null 
              })),
            })),
          })),
        })),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/waitlist',
        body: {
          email: 'test@mail.example.com',
        },
      });

      const response = await waitlistPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should include timestamp in entry', async () => {
      const insertMock = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { 
              id: 'waitlist-1', 
              email: 'test@example.com', 
              status: 'pending',
              created_at: new Date().toISOString()
            }, 
            error: null 
          })),
        })),
      }));

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
          insert: insertMock,
        })),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/waitlist',
        body: {
          email: 'test@example.com',
        },
      });

      await waitlistPOST(request);

      // Verify created_at was set
      const insertedData = insertMock.mock.calls[0][0][0];
      expect(insertedData.created_at).toBeDefined();
    });
  });

  describe('Security Tests', () => {
    it('should not expose database errors to users', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: null, 
                error: { 
                  code: '42P01', 
                  message: 'relation "premium_waitlist" does not exist',
                  details: 'Internal database schema error'
                } 
              })),
            })),
          })),
        })),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/waitlist',
        body: {
          email: 'test@example.com',
        },
      });

      const response = await waitlistPOST(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(500);
      // Should return generic error, not expose database details
      expect(data.error).toBe('Failed to add to waitlist');
      expect(data.error).not.toContain('relation');
      expect(data.error).not.toContain('schema');
    });

    it('should prevent SQL injection in email field', async () => {
      const eqMock = vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      }));

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: eqMock,
          })),
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { id: 'waitlist-1' }, 
                error: null 
              })),
            })),
          })),
        })),
      };

      vi.mocked(createClient).mockReturnValue(mockSupabase as any);

      const maliciousEmail = "test@example.com' OR '1'='1";

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/waitlist',
        body: {
          email: maliciousEmail,
        },
      });

      await waitlistPOST(request);

      // Supabase client should parameterize the query
      // The malicious string should be treated as a literal email
      expect(eqMock).toHaveBeenCalledWith('email', expect.stringContaining("test@example.com' or '1'='1"));
    });
  });
});
